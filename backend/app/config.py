"""Configurações da API, lidas de variáveis de ambiente ou do arquivo .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from db.connection import PROJECT_ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", extra="ignore")

    # Domínios do front-end autorizados (separados por vírgula)
    cors_origins: str = "http://localhost:5173"
    # Limite de requisições por IP a cada minuto
    rate_limit_per_minute: int = 60
    # Por quanto tempo navegador e CDN podem reaproveitar uma resposta (segundos).
    # Os dados da ANP mudam no máximo uma vez por semana.
    cache_max_age: int = 3600
    # Mínimo de coletas no mês para um município entrar no ranking
    ranking_min_coletas: int = 10

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
