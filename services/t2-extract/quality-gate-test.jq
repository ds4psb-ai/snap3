# VDP 품질 게이트 검증 스크립트 (jq)
# 새로운 필드 무결성 표준에 따른 검증

# 1. 필수 식별자 필드
(.content_id and (.content_id | type == "string") and (.content_id != "unknown")) and

# 2. 글로벌 유니크 키
(.content_key and (.content_key | type == "string") and (.content_key | test("^[a-z]+:[^:]+$"))) and

# 3. 플랫폼 정규화 검증
(.metadata.platform and (.metadata.platform | ascii_downcase | . == "youtube" or . == "tiktok" or . == "instagram")) and

# 4. 시간 필드
(.load_timestamp and (.load_timestamp | type == "string") and (.load_timestamp | test("Z$"))) and
(.load_date and (.load_date | type == "string") and (.load_date | test("^\\d{4}-\\d{2}-\\d{2}$"))) and

# 5. Evidence 구조 (null 방지)
(.evidence and (.evidence | type == "object")) and
(.evidence.audio_fingerprint != null) and
(.evidence.product_mentions != null)