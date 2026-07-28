//! Sesi FTP: Penanganan transfer file asinkron via suppaftp (D-6).
//! Trait Session diimplementasikan secara minimal (as_any/close).

use std::any::Any;
use std::sync::Arc;
use tokio::sync::Mutex;
use suppaftp::{AsyncFtpStream, AsyncRustlsFtpStream};

use super::Session;

pub enum FtpClient {
    Plain(AsyncFtpStream),
    Secure(AsyncRustlsFtpStream),
}

impl FtpClient {
    pub async fn login(&mut self, user: &str, pass: &str) -> Result<(), suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.login(user, pass).await,
            Self::Secure(c) => c.login(user, pass).await,
        }
    }

    pub async fn list(&mut self, path: Option<&str>) -> Result<Vec<String>, suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.list(path).await,
            Self::Secure(c) => c.list(path).await,
        }
    }

    pub async fn cwd(&mut self, path: &str) -> Result<(), suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.cwd(path).await,
            Self::Secure(c) => c.cwd(path).await,
        }
    }

    pub async fn pwd(&mut self) -> Result<String, suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.pwd().await,
            Self::Secure(c) => c.pwd().await,
        }
    }

    pub async fn mkdir(&mut self, path: &str) -> Result<(), suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.mkdir(path).await,
            Self::Secure(c) => c.mkdir(path).await,
        }
    }

    pub async fn rmdir(&mut self, path: &str) -> Result<(), suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.rmdir(path).await,
            Self::Secure(c) => c.rmdir(path).await,
        }
    }

    pub async fn rm(&mut self, path: &str) -> Result<(), suppaftp::FtpError> {
        match self {
            Self::Plain(c) => c.rm(path).await,
            Self::Secure(c) => c.rm(path).await,
        }
    }
}

pub struct FtpSession {
    pub client: Arc<Mutex<FtpClient>>,
    pub current_dir: Arc<Mutex<String>>,
}

impl Session for FtpSession {
    fn write(&mut self, _data: &[u8]) -> Result<(), String> {
        Ok(())
    }

    fn resize(&mut self, _cols: u16, _rows: u16) -> Result<(), String> {
        Ok(())
    }

    fn close(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn as_any(&self) -> &dyn Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn Any {
        self
    }
}

/// Verifier yang menerima sertifikat APA PUN — hanya dipakai bila pengguna
/// secara eksplisit meng-opt-in "trust insecure" per-profil (D-26).
/// Default aplikasi TETAP memverifikasi sertifikat.
struct NoVerifier;

impl rustls::client::ServerCertVerifier for NoVerifier {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls::Certificate,
        _intermediates: &[rustls::Certificate],
        _server_name: &rustls::ServerName,
        _scts: &mut dyn Iterator<Item = &[u8]>,
        _ocsp_response: &[u8],
        _now: std::time::SystemTime,
    ) -> Result<rustls::client::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::ServerCertVerified::assertion())
    }
}

/// Bangun root store tepercaya dari webpki-roots (bundel Mozilla CA).
fn build_root_store() -> rustls::RootCertStore {
    let mut roots = rustls::RootCertStore::empty();
    roots.add_trust_anchors(webpki_roots::TLS_SERVER_ROOTS.0.iter().map(|ta| {
        rustls::OwnedTrustAnchor::from_subject_spki_name_constraints(
            ta.subject,
            ta.spki,
            ta.name_constraints,
        )
    }));
    roots
}

/// `allow_insecure`: bila true, lewati verifikasi sertifikat FTPS (opt-in D-26).
/// Bila false (default), sertifikat server diverifikasi terhadap root CA tepercaya.
pub async fn open(
    host: &str,
    port: u16,
    user: &str,
    pass: &str,
    secure: bool,
    allow_insecure: bool,
) -> Result<FtpSession, String> {
    let client = if secure {
        // Hubungkan menggunakan port/stream bertipe secure (rustls)
        let ftp_stream = AsyncRustlsFtpStream::connect((host, port))
            .await
            .map_err(|e| format!("Gagal menghubungi FTP server {host}:{port}: {e}"))?;

        let builder = rustls::ClientConfig::builder().with_safe_defaults();
        let config = if allow_insecure {
            // Opt-in eksplisit pengguna: terima sertifikat apa pun (rentan MITM).
            builder
                .with_custom_certificate_verifier(Arc::new(NoVerifier))
                .with_no_client_auth()
        } else {
            // Default aman: verifikasi terhadap root CA tepercaya.
            builder
                .with_root_certificates(build_root_store())
                .with_no_client_auth()
        };

        let tls_connector = async_tls::TlsConnector::from(Arc::new(config));
        let connector = suppaftp::AsyncRustlsConnector::from(tls_connector);
        let secured = ftp_stream
            .into_secure(connector, host)
            .await
            .map_err(|e| format!("Handshake TLS FTPS gagal: {e}"))?;
        
        FtpClient::Secure(secured)
    } else {
        // Hubungkan menggunakan port/stream biasa (plain)
        let ftp_stream = AsyncFtpStream::connect((host, port))
            .await
            .map_err(|e| format!("Gagal menghubungi FTP server {host}:{port}: {e}"))?;

        FtpClient::Plain(ftp_stream)
    };

    let mut ftp_client = client;
    ftp_client
        .login(user, pass)
        .await
        .map_err(|e| format!("Gagal login ke FTP server: {e}"))?;

    Ok(FtpSession {
        client: Arc::new(Mutex::new(ftp_client)),
        current_dir: Arc::new(Mutex::new("/".to_string())),
    })
}
