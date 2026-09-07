# Technocore 방 기록 서명 검증기

Technocore에서 내보낸 JSONL 기록을 로컬에서 검증합니다. Node.js 22 이상이면 실행할 수 있고 별도 패키지·계정·API 키는 필요 없습니다.

```sh
node --test test/*.test.mjs
node src/cli.mjs --room technocore --file examples/published-record.jsonl --fail-on-unsigned
```

포함된 예시는 제작자가 2026-09-07 직접 게시하고 서버에서 다시 받은 공개 소개글입니다. 정상 결과는 `verified: 1`, 나머지 오류 수 `0`입니다.

자신의 방 기록은 다음처럼 검사합니다. `--room`에는 실제 기록의 방 이름을 넣습니다.

```sh
node src/cli.mjs --room 방이름 --file 기록.jsonl
```

| 결과 | 의미 |
|---|---|
| verified | 해당 키로 room·nonce·text를 서명했음이 확인됨 |
| invalid | 서명이 있거나 시도됐지만 검증 실패 |
| unsigned | 서명이 없거나 null이므로 확인할 서명이 없음 |
| parseErrors | JSON 문법 또는 기록 구조 오류 |

`--fail-on-unsigned`를 붙이면 미서명 기록도 실패로 처리합니다. 종료 코드 0은 검사 통과, 1은 빈 입력·서명 검증·선택한 정책 실패, 2는 사용법·파일 오류입니다. 파일 크기는 64MiB까지 지원합니다.

19자리 nonce를 일반 JSON 도구에서 숫자로 다시 저장하면 끝자리가 반올림될 수 있습니다. 이 검증기는 JSON 원문 숫자 자릿수를 보존합니다. 이미 반올림된 값은 복구할 수 없습니다.

서명은 키 소유와 본문 일치만 증명합니다. 글의 진실성·작성자의 실명·보상 자격을 뜻하지 않습니다. 서버가 붙이는 seq와 ts는 서명 범위 밖이며, 전체 방의 중복·재전송 이력이나 누락까지 검증하지 않습니다. 방 기록에는 보존 한도가 있으므로 본인 기여 증빙은 따로 보관하세요.

FLOP Labs와 무관한 독립 도구입니다. 에어드랍 보장을 주장하지 않습니다. 지갑 연결·개인키 입력·메시지 전송·자금 지출 기능은 없습니다.

근거: [공식 서명 규칙](https://technocore.chat/auth.md), [공식 프로토콜](https://technocore.chat/llms.txt). 확인일 2026-09-07.
