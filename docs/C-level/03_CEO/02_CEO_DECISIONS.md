# 02_CEO_DECISIONS.md

> Version: v1.0 (Draft)
>
> Owner: CEO
>
> Status: Active
>
> Reference:
> - CEO_MASTER.md
> - CEO_EVIDENCE.md
> - CEO_BETA.md

---

# 02_CEO_DECISIONS.md

---

# 문서 정의

본 문서는 KOTA 프로젝트에서 CEO가 최종 승인한 의사결정을 기록하는 문서이다.

회의 내용 전체를 기록하지 않는다.

아이디어를 기록하지 않는다.

최종 승인된 결정만 관리한다.

모든 조직은 본 문서를 기준으로 제품 범위와 프로젝트 방향을 확인한다.

의사결정이 변경될 경우 기존 내용을 삭제하지 않고 변경 이력을 유지한다.

---

# 이 문서가 답하는 질문

- 현재 확정된 의사결정은 무엇인가?
- 어떤 내용이 아직 검토 중인가?
- 어떤 전략이 폐기되었는가?
- 현재 프로젝트의 공식 방향은 무엇인가?
- 각 조직은 어떤 결정을 기준으로 업무를 수행해야 하는가?

---

# 포함 범위

- CEO 승인 사항
- 제품 방향 변경
- Target 변경
- Scope 변경
- MVP 변경
- 전략 변경
- 승인 상태(Status)

---

# 포함하지 않는 범위

- 회의록
- 브레인스토밍
- 기획 아이디어
- 시장조사 원문
- 구현 방법
- 일정 관리

---

# 문서 책임

Owner
CEO

수정 권한
CEO

참조 대상
CEO
CTO
CMO
COO

Source of Truth
CEO

---

# 1. Document Purpose

본 문서는 KOTA 프로젝트에서 CEO가 최종 승인한 의사결정을 관리하는 문서이다.

본 문서는

기획 아이디어를 기록하는 문서가 아니다.

회의록을 기록하는 문서도 아니다.

CEO가

최종 승인한 내용만 기록한다.

모든 조직은

본 문서를 최신 기준(Source of Truth)으로 사용한다.

---

# 2. Decision Rule

Decision는 다음 순서를 따른다.

Evidence

↓

Analysis

↓

Options

↓

CEO Decision

↓

Impact

↓

Status

↓

Owner

---

# 3. Decision Status

| Status | 설명 |
|----------|------|
| Proposed | 제안됨 |
| Under Review | 검토 중 |
| Approved | 승인 |
| Rejected | 기각 |
| Deprecated | 더 이상 사용하지 않음 |
| Archived | 보관 |

---

# 4. Product Decisions

---

## CEO-001

### Topic

프로젝트 목적

### Decision

한국관광공사 Open API를 활용하여 실제 사용자에게 가치 있는 관광 서비스를 구축한다.

### Evidence

CEO_MASTER.md

시장조사 PDF

### Status

Approved

### Impact

전 조직

---

## CEO-002

### Topic

Primary Target

### Decision

현재 MVP는

외국인 자유여행객(FIT)을 대상으로 한다.

### Evidence

시장조사에서는

외국인 시장이 공급 부족이며

일본과 동남아 관광객을 핵심 타겟으로 검토하였다. :contentReference[oaicite:0]{index=0}

Repository 최신 결정

### Status

Approved

### Impact

CTO

CMO

COO

---

## CEO-003

### Topic

사업 방향

### Decision

공모전 제출과

9월 Beta 출시를

현재 최우선 목표로 한다.

### Evidence

프로젝트 일정

Repository

### Status

Approved

### Impact

전 조직

---

## CEO-004

### Topic

제품 방향

### Decision

단순 관광정보 조회 서비스가 아니라

관광 경험을 지원하는 서비스를 구축한다.

### Evidence

CEO_MASTER

시장조사

### Status

Approved

---

## CEO-005

### Topic

Open API 활용 원칙

### Decision

Open API는

기술 경쟁력이 아니라

사용자 가치 제공을 위한 수단으로 활용한다.

### Evidence

CEO_MASTER

### Status

Approved

---

## CEO-006

### Topic

MVP 범위

### Decision

MVP는

핵심 사용자 문제 해결에 필요한 최소 범위만 개발한다.

### Evidence

CEO_MASTER

### Status

Approved

---

## CEO-007

### Topic

우선순위

### Decision

모든 기능은

다음 순서로 판단한다.

1.

사용자 가치

2.

공모전 경쟁력

3.

구현 가능성

4.

일정

5.

유지보수

6.

확장성

### Evidence

CEO 원칙

### Status

Approved

---

## CEO-008

### Topic

Out of Scope

### Decision

다음은

현재 MVP에 포함하지 않는다.

- OTA 구축

- 여행사 플랫폼

- 항공 예약

- 자체 결제 시스템

- 여행 커뮤니티

### Evidence

CEO_MASTER

### Status

Approved

---

## CEO-009

### Topic

제품 철학

### Decision

기능 개수보다

사용자 가치가 우선이다.

### Evidence

CEO 원칙

### Status

Approved

---

## CEO-010

### Topic

Release

### Decision

9월 Beta를

현재 Release 목표로 한다.

### Status

Approved

### Impact

COO

CTO

---

# 5. Pending Decisions

다음 항목은

아직 최종 결정되지 않았다.

| ID | Topic | Status |
|-----|---------|---------|
| PD-001 | KPI 정의 | Under Review |
| PD-002 | Beta 성공 기준 | Under Review |
| PD-003 | Launch 이후 BM | Under Review |
| PD-004 | 해외 마케팅 전략 | Under Review |
| PD-005 | 수익모델 세부안 | Under Review |

---

# 6. Deprecated Decisions

현재 없음.

추후 전략 변경 시

기존 Decision은 삭제하지 않고

Deprecated 처리한다.

---

# 7. Decision Management Rules

모든 Decision은

삭제하지 않는다.

변경 시

새로운 Decision ID를 발급한다.

---

Decision는

회의록으로 관리하지 않는다.

회의 결과만 기록한다.

---

아이디어는

Decision이 아니다.

아이디어는

Appendix 또는

CEO_EVIDENCE에서 관리한다.

---

# Appendix A. Candidate Decisions

다음 항목은

향후 CEO Decision 대상이다.

| Topic | Current Status |
|---------|----------------|
| Festival Pass | Future Review |
| QR Pass | Future Review |
| One-Tap UX | Under Review |
| Ticket Integration | Future Review |
| Local Experience Package | Future Review |