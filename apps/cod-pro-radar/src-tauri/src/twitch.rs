use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration as StdDuration;
use tokio::sync::Mutex;

const HELIX: &str = "https://api.twitch.tv/helix";
const ID: &str = "https://id.twitch.tv/oauth2";
// Only needed for "followed live channels" suggestions; the radar itself uses
// public endpoints.
pub const SCOPES: &str = "user:read:follows";
const KEYRING_SERVICE: &str = "cod-pro-radar";
const KEYRING_USER: &str = "twitch-oauth";
const HELIX_BATCH: usize = 100;

#[derive(Debug, thiserror::Error)]
pub enum TwitchError {
    #[error("Nicht mit Twitch verbunden")]
    NotAuthenticated,
    #[error("Keine Twitch Client-ID konfiguriert")]
    MissingClientId,
    #[error("Twitch-Anmeldung abgelaufen – bitte erneut verbinden")]
    Unauthorized,
    #[error("Twitch-Ratenlimit erreicht")]
    RateLimited,
    #[error("Netzwerkfehler: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Twitch-Fehler {0}: {1}")]
    Api(u16, String),
}

pub type TwitchResult<T> = Result<T, TwitchError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: DateTime<Utc>,
    pub login: String,
    pub user_id: String,
    pub client_id: String,
    #[serde(default)]
    pub validated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
}

#[derive(Debug, Deserialize)]
struct ValidateResponse {
    login: String,
    user_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: i64,
    pub interval: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct HelixUser {
    pub id: String,
    pub login: String,
    pub display_name: String,
    pub profile_image_url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct HelixStream {
    pub user_id: String,
    pub user_login: String,
    pub user_name: String,
    pub game_name: String,
    pub title: String,
    pub viewer_count: i64,
    pub started_at: String,
}

#[derive(Deserialize)]
struct HelixData<T> {
    data: Vec<T>,
}

#[derive(Deserialize)]
struct ErrorBody {
    #[serde(default)]
    message: String,
}

pub enum DevicePoll {
    Pending,
    SlowDown,
    Done(StoredToken),
    Expired,
    Denied,
}

pub struct TwitchClient {
    http: reqwest::Client,
    token: Mutex<Option<StoredToken>>,
}

fn keyring_entry() -> Option<keyring::Entry> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).ok()
}

fn load_token() -> Option<StoredToken> {
    let raw = keyring_entry()?.get_password().ok()?;
    serde_json::from_str(&raw).ok()
}

fn persist_token(token: Option<&StoredToken>) {
    let Some(entry) = keyring_entry() else { return };
    let result = match token {
        Some(t) => entry.set_password(&serde_json::to_string(t).expect("token serialize")),
        None => entry.delete_credential(),
    };
    if let Err(e) = result {
        if !matches!(e, keyring::Error::NoEntry) {
            eprintln!("[auth] Konnte Token nicht im Anmeldeinformationsspeicher sichern: {e}");
        }
    }
}

async fn error_from(resp: reqwest::Response) -> TwitchError {
    let status = resp.status().as_u16();
    if status == 401 {
        return TwitchError::Unauthorized;
    }
    if status == 429 {
        return TwitchError::RateLimited;
    }
    let msg = resp
        .json::<ErrorBody>()
        .await
        .map(|b| b.message)
        .unwrap_or_default();
    TwitchError::Api(status, msg)
}

pub fn normalize_login(input: &str) -> Option<String> {
    let trimmed = input.trim().trim_start_matches('@');
    let login = trimmed
        .rsplit_once("twitch.tv/")
        .map(|(_, rest)| rest)
        .unwrap_or(trimmed)
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .to_lowercase();
    let valid = (3..=25).contains(&login.len())
        && login.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
    valid.then_some(login)
}

impl TwitchClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .timeout(StdDuration::from_secs(15))
            .user_agent(concat!("COD-Pro-Radar/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("http client");
        TwitchClient {
            http,
            token: Mutex::new(load_token()),
        }
    }

    pub async fn current(&self) -> Option<StoredToken> {
        self.token.lock().await.clone()
    }

    async fn store(&self, token: Option<StoredToken>) {
        persist_token(token.as_ref());
        *self.token.lock().await = token;
    }

    pub async fn start_device_flow(&self, client_id: &str) -> TwitchResult<DeviceCode> {
        if client_id.is_empty() {
            return Err(TwitchError::MissingClientId);
        }
        let resp = self
            .http
            .post(format!("{ID}/device"))
            .form(&[("client_id", client_id), ("scopes", SCOPES)])
            .send()
            .await?;
        if !resp.status().is_success() {
            return Err(error_from(resp).await);
        }
        Ok(resp.json().await?)
    }

    pub async fn poll_device_flow(&self, client_id: &str, device_code: &str) -> TwitchResult<DevicePoll> {
        let resp = self
            .http
            .post(format!("{ID}/token"))
            .form(&[
                ("client_id", client_id),
                ("scopes", SCOPES),
                ("device_code", device_code),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ])
            .send()
            .await?;
        if resp.status().is_success() {
            let tok: TokenResponse = resp.json().await?;
            let stored = self.finish_token(client_id, tok).await?;
            return Ok(DevicePoll::Done(stored));
        }
        let msg = resp
            .json::<ErrorBody>()
            .await
            .map(|b| b.message)
            .unwrap_or_default();
        Ok(match msg.as_str() {
            "authorization_pending" => DevicePoll::Pending,
            "slow_down" => DevicePoll::SlowDown,
            "access_denied" => DevicePoll::Denied,
            _ => DevicePoll::Expired,
        })
    }

    async fn finish_token(&self, client_id: &str, tok: TokenResponse) -> TwitchResult<StoredToken> {
        let info = self.validate_raw(&tok.access_token).await?;
        let stored = StoredToken {
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: Utc::now() + Duration::seconds(tok.expires_in),
            login: info.login,
            user_id: info.user_id,
            client_id: client_id.to_string(),
            validated_at: Some(Utc::now()),
        };
        self.store(Some(stored.clone())).await;
        Ok(stored)
    }

    async fn validate_raw(&self, access_token: &str) -> TwitchResult<ValidateResponse> {
        let resp = self
            .http
            .get(format!("{ID}/validate"))
            .header("Authorization", format!("OAuth {access_token}"))
            .send()
            .await?;
        if !resp.status().is_success() {
            return Err(error_from(resp).await);
        }
        Ok(resp.json().await?)
    }

    async fn refresh(&self, token: &StoredToken) -> TwitchResult<StoredToken> {
        let Some(refresh) = token.refresh_token.as_deref() else {
            return Err(TwitchError::Unauthorized);
        };
        let resp = self
            .http
            .post(format!("{ID}/token"))
            .form(&[
                ("client_id", token.client_id.as_str()),
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh),
            ])
            .send()
            .await?;
        if !resp.status().is_success() {
            let err = error_from(resp).await;
            if matches!(err, TwitchError::Api(400, _) | TwitchError::Unauthorized) {
                self.store(None).await;
                return Err(TwitchError::Unauthorized);
            }
            return Err(err);
        }
        let tok: TokenResponse = resp.json().await?;
        self.finish_token(&token.client_id, tok).await
    }

    /// Returns a usable token, refreshing it and re-validating it hourly as
    /// Twitch requires for user tokens.
    pub async fn ensure_token(&self, client_id: &str) -> TwitchResult<StoredToken> {
        let token = self.current().await.ok_or(TwitchError::NotAuthenticated)?;
        if !client_id.is_empty() && token.client_id != client_id {
            // Client-ID changed in settings: the old token belongs to another app.
            self.store(None).await;
            return Err(TwitchError::NotAuthenticated);
        }
        let now = Utc::now();
        if token.expires_at - now < Duration::minutes(5) {
            return self.refresh(&token).await;
        }
        let needs_validation = token
            .validated_at
            .is_none_or(|t| now - t > Duration::hours(1));
        if needs_validation {
            match self.validate_raw(&token.access_token).await {
                Ok(_) => {
                    let mut t = token.clone();
                    t.validated_at = Some(now);
                    self.store(Some(t.clone())).await;
                    return Ok(t);
                }
                Err(TwitchError::Unauthorized) => return self.refresh(&token).await,
                Err(e) => return Err(e),
            }
        }
        Ok(token)
    }

    pub async fn logout(&self) {
        if let Some(t) = self.current().await {
            let _ = self
                .http
                .post(format!("{ID}/revoke"))
                .form(&[("client_id", t.client_id.as_str()), ("token", t.access_token.as_str())])
                .send()
                .await;
        }
        self.store(None).await;
    }

    async fn helix_get<T: for<'de> Deserialize<'de>>(
        &self,
        token: &StoredToken,
        path: &str,
        query: &[(&str, &str)],
    ) -> TwitchResult<Vec<T>> {
        let resp = self
            .http
            .get(format!("{HELIX}{path}"))
            .header("Client-Id", &token.client_id)
            .bearer_auth(&token.access_token)
            .query(query)
            .send()
            .await?;
        if !resp.status().is_success() {
            return Err(error_from(resp).await);
        }
        Ok(resp.json::<HelixData<T>>().await?.data)
    }

    pub async fn users_by_login(&self, token: &StoredToken, logins: &[String]) -> TwitchResult<Vec<HelixUser>> {
        let mut out = Vec::new();
        for chunk in logins.chunks(HELIX_BATCH) {
            let q: Vec<(&str, &str)> = chunk.iter().map(|l| ("login", l.as_str())).collect();
            out.extend(self.helix_get::<HelixUser>(token, "/users", &q).await?);
        }
        Ok(out)
    }

    pub async fn users_by_id(&self, token: &StoredToken, ids: &[String]) -> TwitchResult<Vec<HelixUser>> {
        let mut out = Vec::new();
        for chunk in ids.chunks(HELIX_BATCH) {
            let q: Vec<(&str, &str)> = chunk.iter().map(|l| ("id", l.as_str())).collect();
            out.extend(self.helix_get::<HelixUser>(token, "/users", &q).await?);
        }
        Ok(out)
    }

    /// One request per 100 channels: only live channels are returned.
    pub async fn live_streams(&self, token: &StoredToken, user_ids: &[String]) -> TwitchResult<Vec<HelixStream>> {
        let mut out = Vec::new();
        for chunk in user_ids.chunks(HELIX_BATCH) {
            let mut q: Vec<(&str, &str)> = chunk.iter().map(|id| ("user_id", id.as_str())).collect();
            q.push(("first", "100"));
            out.extend(self.helix_get::<HelixStream>(token, "/streams", &q).await?);
        }
        Ok(out)
    }

    pub async fn followed_live_streams(&self, token: &StoredToken) -> TwitchResult<Vec<HelixStream>> {
        self.helix_get::<HelixStream>(
            token,
            "/streams/followed",
            &[("user_id", token.user_id.as_str()), ("first", "100")],
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_login;

    #[test]
    fn normalizes_logins_and_urls() {
        assert_eq!(normalize_login("Pirate").as_deref(), Some("pirate"));
        assert_eq!(normalize_login(" @Dki_ ").as_deref(), Some("dki_"));
        assert_eq!(
            normalize_login("https://www.twitch.tv/SomePro?sr=a").as_deref(),
            Some("somepro")
        );
        assert_eq!(normalize_login("a b"), None);
        assert_eq!(normalize_login("x"), None);
    }
}
