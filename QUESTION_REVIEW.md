# 문제 검토 결과

검토일: 2026-09-30

## 부족한 학습 범위 보충 (2026-10-03)

- [CKA](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/), [CKAD](https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/), [CKS](https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/) 공식 영역과 기존 질문 본문·제목·모범 입력을 비교했다. 고급 장애 사례에 비해 로그·메트릭의 기본 조회, 다중 컨테이너·쿼터 기본 구성, API 변경 대응이 적고 보안 과제가 여러 과목에 흩어져 있었다.
- `관찰·진단`: 6개 시나리오·18문항. 컨테이너별/이전 로그, Metrics Server·실사용량, 이벤트, JSONPath·커스텀 컬럼, exec·ephemeral container, 폐기 API·서버 dry-run을 보충했다.
- `보안·하드닝`: 10개 시나리오·30문항. 신뢰된 체크섬·CIS 점검, RBAC·토큰, Pod Security Admission, seccomp·RuntimeClass, 감사 정책, 저장 암호화, 서명·digest, Falco 조사, kubelet 접근 제한을 한 과목으로 구성했다.
- `워크로드·배포`: 7개 시나리오·21문항 추가. 매니페스트 초안·스키마 조회, command/args, Downward API, Quota/LimitRange, 다중 컨테이너·네이티브 사이드카, 설정 주입, HPA 기본 구성·계산을 보충했다. 기존 문항 ID와 내용을 유지했다.
- 총 7개 과목·207개 시나리오·884문항이다. 새 문항에는 시험·주제 태그, 공식 문서, 오답별 근거, 모범 입력과 예제를 넣었다. 실제 출제 빈도를 추정하지 않으며 실행 검증 상태는 `not-run`이다.
- 예제의 전제도 명시했다. Metrics Server, impersonation 권한, 디버그 런타임 지원, 노드 seccomp 파일, RuntimeClass handler, 감사·암호화 파일 마운트 등은 별도 준비가 필요하다. 제어 평면 변경은 전용 연습 클러스터 조건이다. 서버 dry-run이나 데이터 검증을 실제 작업 성공으로 간주하지 않는다.
- 기존 815문항 전체를 재검토하거나 공식 시험 영역의 모든 작업을 완전히 다뤘다는 주장은 하지 않는다. CKS의 개별 CNI 암호화·호스트 OS 실습과 전체 예제의 클러스터 실행 검증은 별도 보충 대상이다.

## 학습 흐름 보완 (2026-10-02)

- 보기 길이만으로 정답을 추측하는 문제를 줄이기 위해 회상 입력을 기본으로 변경했다. 보기 힌트를 본 문항은 도움 없는 회상 점수에서 제외하고 시간 제한 연습에서는 보기를 제공하지 않는다. 기존 객관식 779문항 전체를 재작성한 것은 아니며 네트워크 핵심 5문항의 보기를 균형 있게 수정했다.
- 직접 입력은 등록 답안 전체 비교로 변경했다. 틀린 명령에 정답 핵심어만 들어 있거나 부정문에 핵심어가 들어 있어도 통과하지 않는 회귀 검증을 모든 문항에 추가했다. 네트워크 1번은 올바른 명령의 명시적 별칭도 보충했다.
- 시험·파트 필터를 문항 단위로 적용하고 결과 분모를 선택한 전체 문항으로 변경했다. 시간 제한·진행 복원·미응답 채점도 추가했다.
- 워크로드 12개 시나리오·36문항을 추가해 총 184개 시나리오·815문항이 됐다. 보충 문항에는 공식 학습 영역과 문서 대조 상태를 기록했고 추정 출제 빈도를 붙이지 않았다.
- 개인 클러스터용 20개 독립 실습 가이드를 추가했다. 준비·작업·완료 검증·정리 조건과 정적 다운로드 파일을 제공한다. 체크리스트는 자가 확인이며 자동 실행 검증을 주장하지 않는다. 모든 실습을 실제 클러스터에서 실행한 검증은 포함하지 않는다.
- 기존 779문항의 출제 빈도 출처·적용 버전 전면 정비와 기존 문항 전체의 독립적 내용 재검증은 완료했다고 주장하지 않는다.

## 반영 상태 (2026-09-30)

아래의 채점 오류, 우선 수정 3건, 해설·정답 문구 표의 수정 사항을 반영했다. Ingress NGINX 유지보수 종료와 ANP/BANP v1alpha1 적용 범위도 문항에 표시했다. 시나리오 전환 후 172개 과제·779개 하위 문항에 대해 모범 답안과 객관식 전체 정답·부분 점수·미응답 채점을 자동 검증한다. 아래 본문은 수정 전 검토 기록이다. 공통 버전 메타데이터와 출제 빈도 출처의 전면 정비는 포함하지 않는다.

## 범위와 검증

- 스토리지 74, 네트워크 200, 클러스터 200, 트러블슈팅 300: 총 774문항의 문제와 지정 정답을 검토했다.
- 의심 문항의 선택지·해설·예제·주의사항을 추가 확인하고 공식 문서와 대조했다. 모든 해설의 모든 문장을 독립적으로 검증하거나 예제를 실제 클러스터에서 실행한 검토는 아니다.
- `npm run validate`: 4개 과목, 774문항 통과. 데이터 형식 검사는 내용의 정확성까지 보장하지 않는다.
- 현행 주관식 채점 조건으로 774개 모범 답안을 검사한 결과 13개가 오답 처리됐다.
- 아래는 확인된 수정 사항과 버전 명시가 필요한 사항이다. 문제 데이터와 서비스 배포는 이번 검토에서 변경하지 않았다.

## 우선 수정

### 1. 모범 답안을 입력해도 오답 처리되는 13문항

위치: `assets/js/quiz.js:227`, 해당 문항의 `type.acc`와 `type.model`.

채점은 정규화 후 완전 일치하거나, 정답 키가 6자 이상일 때 부분 일치해야 통과한다. 짧은 키만 등록된 문항은 필드 이름이나 명령 인수를 포함한 모범 답안을 거부한다.

| 과목 | 문항 번호 |
| --- | --- |
| 스토리지 | 32 |
| 네트워크 | 10, 37, 38, 95, 118, 125, 126, 129, 130, 143, 144, 177 |

예: 네트워크 37의 `pathType: Exact`는 등록 키 `exact`가 5자여서 오답이다. 스토리지 32의 CSI 예제도 등록 키 `csi`와 완전 일치하지 않아 실패한다.

수정: 모범 답안의 정규화된 완전 일치를 인정하고, 각 문항에 실제로 허용할 답안 형식을 등록한다. 짧은 키도 무조건 부분 일치시키면 잘못된 문장을 정답으로 인정할 수 있으므로 피한다. 검증 스크립트에 모범 답안의 채점 통과 여부를 추가한다.

### 2. 스토리지 73 — Bash 예약 변수와 SSH 변수 전달

예제의 `UID=abcd-1234`는 Bash에서 실패한다. `UID`는 읽기 전용 사용자 ID다. 뒤의 경로가 의도한 파드 UID를 가리키지 않으며, 로컬 변수는 `ssh worker-1` 뒤 원격 셸에 자동으로 전달되지도 않는다.

수정: `POD_UID`처럼 별도 변수를 사용하고 원격 노드에서도 값을 명시적으로 설정한다. 대상 경로와 마운트를 확인한 뒤 해제하도록 예제를 고친다.

근거: [GNU Bash 변수 문서](https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html).

### 3. 트러블슈팅 161 — 손상 여부를 확인하기 전에 복구 명령 제시

`wrong fs type, bad superblock`만으로 파일시스템 손상이라고 단정하고 `fsck -y`를 제시한다. 같은 문항의 주의사항에도 잘못된 `fsType`으로 발생할 수 있다고 적혀 있어 정답과 모순된다. 파드 중지만으로 장치가 언마운트됐다고 보장할 수도 없다.

수정: 파일시스템 종류·마운트 설정·로그를 먼저 확인하고, 손상이 확인된 경우에 한해 스냅샷과 실제 언마운트 확인 후 해당 파일시스템용 복구 도구를 사용하도록 순서를 바꾼다. 자동 승인 복구를 첫 조치로 제시하지 않는다.

### 4. 트러블슈팅 220 — SAN 변경과 인증서 갱신 혼동

정답 선택지는 SAN 누락에 `kubeadm certs renew etcd-peer`를 제시하지만, 주의사항은 새 SAN으로 재생성이 필요하다고 설명한다. `renew`는 기존 인증서의 SAN을 재사용하므로 누락된 새 IP를 추가하지 않는다.

수정: 만료 갱신과 SAN 변경을 분리한다. SAN 변경 시 올바른 설정과 CA로 인증서를 재생성하고 적용하는 절차를 정답에 명시한다.

근거: [kubeadm 인증서 관리](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/).

## 해설·정답 문구 수정

| 문항 | 확인된 문제 | 수정 방향 / 근거 |
| --- | --- | --- |
| 스토리지 26 | PVC 클론의 조건으로 같은 StorageClass를 강제한다. | 다른 StorageClass도 가능하며 드라이버의 클론 지원 조건을 확인해야 한다. [공식 클론 문서](https://v1-32.docs.kubernetes.io/docs/concepts/storage/volume-pvc-datasource/) |
| 스토리지 30 | `subPathExpr` 환경변수가 없으면 빈 경로로 마운트돼 볼륨 루트에 쓴다고 설명한다. | kubelet은 누락되거나 빈 값이면 오류를 반환한다. [kubelet 구현](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/container/helpers.go) |
| 스토리지 22, 56 | 디스크 emptyDir까지 개별 컨테이너 limit에 합산된다고 설명한다. | 컨테이너 한도는 쓰기 레이어·로그, Pod 합산 한도에는 emptyDir도 포함됨을 구분한다. 메모리 emptyDir는 메모리로 계산한다. [자원 관리 문서](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage) |
| 스토리지 46 | AppArmor GA를 v1.30이라고 설명한다. | 필드 방식 도입은 v1.30, GA는 v1.31이다. [v1.31 발표](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/) |
| 스토리지 54 | `etcd 3.5+`에서 `etcdctl snapshot restore`도 동작한다고 설명한다. | 3.6에서 제거됐다. 현재 예제의 `etcdutl snapshot restore`를 유지하고 잘못된 주석을 수정한다. [etcd 3.6 발표](https://etcd.io/blog/2025/announcing-etcd-3.6/) |
| 스토리지 70 | `fd.name startswith /data`는 `/database` 같은 다른 경로도 매칭한다. | `/data/` 경계 또는 경로 매칭 연산자를 사용한다. `open_write`는 쓰기 모드 열기 탐지이므로 모든 파일 변경 탐지처럼 설명하지 않는다. [Falco 조건 문법](https://falco.org/docs/concepts/rules/conditions/) |
| 트러블슈팅 49 | 하이픈 포함 키를 유효하지 않은 환경변수 이름의 예로 든다. | 현재 API는 `=`를 제외한 출력 가능한 ASCII 이름을 허용한다. 셸 변수 문법과 Kubernetes 환경변수 규칙을 구분하고 버전을 명시한다. [Pod API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/) |
| 클러스터 43 | 첫 컨트롤 플레인에서 CoreDNS·kube-proxy도 곧바로 업그레이드된다고 읽힌다. 인증서는 만료가 가까운 것만 갱신하는 것처럼 설명한다. | v1.28 이후 HA에서는 모든 컨트롤 플레인의 업그레이드 완료를 확인한 뒤 애드온을 업그레이드한다. 인증서 갱신은 만료 임박 여부에 한정되지 않는다. [업그레이드 절차](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/), [인증서 갱신](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs/) |

## 버전과 지원 상태를 명시할 문항

- **Ingress NGINX 관련 문항:** 기존 설치의 동작을 묻는 문제 자체가 모두 틀린 것은 아니다. 다만 2026년 3월 유지보수 종료를 명시하고 신규 운영 권장안과 기존 환경 문제 풀이를 구분해야 한다. Ingress API 자체의 폐지와 혼동하지 않아야 한다. [공식 종료 공지](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- **네트워크 137·138:** ANP/BANP의 v1alpha1 예제라는 점을 제목 또는 문제에 명시한다. 최신 API 계열은 v1alpha2 ClusterNetworkPolicy로 통합됐다. 기존 v1alpha1 배포도 안내되고 있으므로 기존 예제를 무조건 삭제할 사안은 아니다. [공식 시작 안내](https://network-policy-api.sigs.k8s.io/getting-started/)
- **공통:** Kubernetes·etcd·containerd·CNI 등 버전 의존 문항에 적용 버전을 저장할 필드가 필요하다. 출제 빈도 표시는 공식 통계인지 경험적 추정인지 구분할 출처가 필요하다.

## 권장 반영 순서

1. 13문항의 채점 오류와 모범 답안 검증을 수정한다.
2. 스토리지 73, 트러블슈팅 161·220의 실행 절차와 정답을 수정한다.
3. 나머지 해설 오류를 수정하고 버전 정보를 붙인다.
4. 변경 문항의 선택지·정답·해설·예제·주의사항을 함께 검증한 뒤 배포한다.
