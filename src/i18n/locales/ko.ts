export default {
  translation: {
    logoutConfirm: {
      title: "로그아웃",
      description: "로그아웃할까요? 동기화되지 않은 로컬 변경 사항이 사라질 수 있습니다.",
      clearLocalLabel: "로컬 데이터를 지우고 기본값으로 복원",
      clearLocalDesc: "로컬 바로가기를 선택한 역할의 초기 구성으로 복원",
      confirm: "로그아웃",
      cancel: "취소"
    },
    settings: {
      title: "설정",
      profile: {
        loggedInDesc: "로그인됨",
        daysActive: "활동 일수",
        shortcutsCount: "바로가기",
        guest: "게스트",
        guestDesc: "로그인하여 데이터 동기화"
      },
      newTabMode: {
        label: "새 탭에서 열기",
        description: "바로가기를 기본적으로 새 탭에서 열기"
      },
      searchEngineTabSwitch: {
        label: "Tab 검색엔진 전환",
        description: "검색창에 포커스된 상태에서 Tab 키로 검색엔진을 순환 전환합니다"
      },
      searchSettings: {
        label: "검색 설정",
        description: "검색 동작과 고급 검색 기능을 관리합니다",
        open: "열기",
        title: "검색 설정",
        items: {
          tabSwitch: {
            label: "Tab 검색엔진 전환",
            description: "검색창 포커스 상태에서 Tab으로 엔진 전환",
            tooltip: "검색창이 포커스된 상태에서 Tab / Shift+Tab으로 검색엔진을 빠르게 전환합니다."
          },
          prefix: {
            label: "Prefix 검색",
            description: "g / bing / ddg / bd 같은 접두어로 임시 엔진 지정",
            tooltip: "예: `g AI` 입력 시 해당 검색만 Google로 실행되고 기본 엔진은 유지됩니다."
          },
          siteDirect: {
            label: "사이트 직접 검색",
            description: "`사이트 + 키워드` 입력 시 해당 사이트 검색 결과를 우선 열기",
            tooltip: "GitHub, GitLab, Gitee, Zhihu, Bilibili, YouTube, Google, Bing, Baidu, Wikipedia, Reddit, Amazon 등 주요 사이트를 지원합니다. 예: `github react`."
          },
          siteShortcut: {
            label: "사이트 바로가기 추천",
            description: "사이트명을 입력하면 내장 사이트 추천을 우선 표시",
            tooltip: "예: `git` 입력 시 GitHub / GitLab / Gitee 추천을 우선 노출합니다."
          },
          anyKeyCapture: {
            label: "아무 키나 바로 검색",
            description: "새 탭을 열고 바로 입력하면 검색창으로 자동 입력",
            tooltip: "활성화하면 빈 영역에서 문자 키를 누를 때 검색창에 자동 포커스됩니다."
          },
          calculator: {
            label: "계산기 미리보기",
            description: "수식 입력 시 실시간 계산 결과를 추천에 표시",
            tooltip: "예: `12*8` 입력 시 드롭다운에 계산 결과가 표시됩니다."
          },
          rotatingPlaceholder: {
            label: "검색창 안내 문구 순환",
            description: "검색창 안내 문구를 자동으로 바꿔 보여줍니다",
            tooltip: "끄면 검색창에는 하나의 고정된 안내 문구만 표시됩니다."
          }
        }
      },
      timeFormat: {
        label: "24시간 형식",
        description: "시간을 24시간 형식으로 표시"
      },
      showSeconds: {
        label: "초 표시",
        description: "시간 구성 요소에 초를 표시합니다"
      },
      visualEffectsLevel: {
        label: "부드러움 단계",
        description: "기기 성능에 맞게 효과 강도를 선택",
        low: "낮음",
        medium: "중간",
        high: "높음"
      },
      showTime: {
        label: "시간 표시",
        description: "페이지에 시간을 표시합니다"
      },
      timeFont: {
        title: "시간 글꼴",
        description: "시간 표시에 사용할 글꼴을 선택하세요"
      },
      autoFocusSearch: {
        label: "검색창 자동 포커스",
        description: "페이지에 진입할 때 자동으로 검색창에 포커스를 둡니다"
      },
      language: {
        label: "언어",
        description: "인터페이스 언어 선택",
        selectPlaceholder: "언어 선택"
      },
      theme: {
        label: "테마",
        description: "라이트/다크 모드 전환 또는 시스템 설정 따르기",
        selectPlaceholder: "테마 선택",
        system: "시스템",
        light: "라이트",
        dark: "다크"
      },
      accentColor: {
        label: "강조 색상",
        description: "앱의 주요 색상 선택"
      },
      accent: {
        dynamic: "동적",
        mono: "모노",
        green: "초록",
        blue: "파랑",
        purple: "보라",
        orange: "주황",
        pink: "분홍",
        red: "빨강"
      },
      displayMode: {
        title: "표시 모드",
        description: "페이지 레이아웃 스타일 선택",
        blank: "빈 화면",
        blankDesc: "시간, 배경화면, 바로가기 숨김",
        rhythm: "리듬",
        rhythmDesc: "검색과 바로가기만 유지",
        panoramic: "파노라마",
        panoramicDesc: "시간, 날씨, 배경화면, 바로가기 표시"
      },
      shortcutsLayout: {
        label: "바로가기 밀도",
        description: "열당 바로가기 개수를 조정합니다",
        set: "설정",
        select: "선택"
      },
      shortcutsStyle: {
        label: "바로가기 스타일",
        entryDescription: "스타일을 바꾸고 그리드 열 수와 기본 행 수를 설정합니다",
        open: "열기",
        title: "바로가기 스타일 설정",
        description: "바로가기 스타일을 선택하고 단일 페이지 그리드의 열 수와 기본 행 수를 설정합니다",
        rich: "리치",
        compact: "미니멀",
        showName: "이름 표시",
        showNameDesc: "켜면 아이콘 아래에 바로가기 이름을 표시합니다",
        columns: "그리드 열 수",
        rows: "기본 행 수"
      },
      backup: {
        label: "데이터 백업 및 복원",
        description: "로컬 레이아웃 데이터 가져오기/내보내기 (.leaftab)",
        cloudTab: "클라우드 동기화",
        webdavTab: "WebDAV 동기화",
        import: "데이터 가져오기",
        export: "데이터 내보내기",
        importSuccess: "데이터 가져오기에 성공했습니다",
        importError: "데이터 가져오기에 실패했습니다. 파일 형식을 확인하세요.",
        exportSuccess: "데이터 내보내기에 성공했습니다",
        webdav: {
          entry: "WebDAV 동기화",
          entryDesc: "WebDAV 원격 백업 및 복원을 설정",
          configure: "설정",
          pull: "클라우드에서 가져오기",
          push: "클라우드로 보내기",
          sync: "지금 동기화",
          url: "WebDAV URL",
          filePath: "원격 파일 경로",
          username: "사용자 이름",
          password: "비밀번호",
          profileName: "설정 이름",
          profileNamePlaceholder: "예: 홈 NAS",
          usernamePlaceholder: "선택",
          passwordPlaceholder: "선택",
          syncByScheduleLabel: "예약 자동 동기화",
          syncByScheduleDesc: "고정 간격으로 자동 동기화합니다",
          autoSyncToastLabel: "자동 동기화 성공 알림",
          autoSyncToastDesc: "예약 자동 동기화 성공 후 토스트 알림을 표시합니다",
          syncIntervalLabel: "동기화 간격",
          policyMerge: "로컬과 클라우드 변경을 가능한 한 병합(권장)",
          policyPreferRemote: "클라우드 버전 우선(로컬 덮어씀)",
          policyPreferLocal: "로컬 버전 우선(클라우드 덮어씀)",
          download: "WebDAV에서 가져오기",
          upload: "WebDAV로 동기화",
          downloading: "가져오는 중...",
          uploading: "동기화 중...",
          downloadSuccess: "WebDAV 가져오기에 성공했습니다",
          uploadSuccess: "WebDAV 동기화에 성공했습니다",
          downloadError: "WebDAV 가져오기에 실패했습니다. 설정을 확인하세요.",
          uploadError: "WebDAV 동기화에 실패했습니다. 설정을 확인하세요.",
          syncSuccess: "동기화 완료",
          syncError: "동기화 실패. 설정을 확인하세요.",
          authFailed: "WebDAV 인증에 실패했습니다. 아이디 또는 비밀번호를 확인하세요.",
          policyChangeSyncTriggered: "충돌 정책을 변경해 현재 정책으로 한 번 동기화했습니다",
          intervalChangeSyncTriggered: "동기화 간격을 변경해 즉시 한 번 동기화했습니다",
          urlRequired: "먼저 WebDAV URL을 입력하세요",
          defaultProfileName: "기본 설정",
          configured: "설정 완료, 동기화 가능",
          notConfigured: "미설정, WebDAV 정보를 입력하세요",
          disabled: "비활성화됨 (WebDAV 동기화 중지됨)",
          lastSyncAt: "마지막 동기화",
          notSynced: "동기화 안 됨",
          justSynced: "방금 동기화됨",
          minutesAgo: "{{count}}분 전",
          hoursAgo: "{{count}}시간 전",
          lastAttemptFailed: "최근 동기화 시도가 실패했습니다",
          scheduleRunning: "예약 동기화가 실행 중입니다",
          nextSyncAtLabel: "다음 동기화: {{time}}",
          syncDisabled: "먼저 WebDAV 동기화를 활성화하세요"
        }
      },
      changelog: {
        title: "업데이트 로그",
        description: "최근 기능 및 UX 업데이트 보기",
        open: "업데이트 로그 보기"
      },
      privacyPolicy: "개인정보 처리방침",
      copyright: "All rights reserved.",
      specialThanks: "테스터에게 특별한 감사: yanshuai, Horang, Mling",
      iconAssistant: {
        title: "익명 사용 통계 전송",
        desc: "아이콘 지원 최적화를 도와주세요 (도메인만 전송, 개인정보 없음)",
        modalTitle: "LeafTab 개선 돕기",
        modalDesc: "더 나은 아이콘 지원을 제공하기 위해 바로가기의 도메인(예: google.com)을 수집하고자 합니다. 데이터는 완전히 익명이며 개인정보나 전체 URL을 포함하지 않습니다.",
        agree: "동의하고 활성화",
        disagree: "동의하지 않음",
        adminKeyLabel: "관리자 키",
        adminKeyDesc: "전체 수집 도메인 목록을 내보내려면 필요합니다 (운영자/자체 호스팅 전용)",
        adminKeyPlaceholder: "관리자 키 입력",
        adminKeySave: "저장",
        adminKeyClear: "지우기",
        adminKeySaved: "관리자 키가 저장되었습니다",
        adminKeyCleared: "관리자 키가 삭제되었습니다",
        adminKeyRequired: "관리자 키가 필요합니다",
        adminKeyInvalid: "관리자 키가 유효하지 않거나 권한이 없습니다",
        confirmClose: "끄면 우선 아이콘 지원이 중지됩니다. 비활성화할까요?",
        downloadTitle: "수집된 도메인 목록 다운로드",
        downloadDesc: "도메인만, 중복 제거, 이미 지원되는 아이콘 제외",
        downloadButton: "목록 다운로드",
        reportNow: "즉시 전송",
        reportTriggered: "전송을 트리거했습니다 (빈도 제한 가능)",
        queueStatus: "대기: {{count}}, 마지막 전송: {{last}}",
        downloadSuccess: "도메인 목록을 다운로드했습니다",
        downloadFailed: "다운로드 실패. 잠시 후 다시 시도하세요"
      },
      adminMode: {
        tapRemaining: "{{count}}번 더 탭하면 관리자 모드로 진입합니다",
        enabled: "관리자 모드에 진입했습니다",
        alreadyEnabled: "이미 관리자 모드입니다",
        disabled: "관리자 모드가 비활성화되었습니다",
        switchLabel: "관리자 모드",
        switchDesc: "관리자 키를 설정하고 전체 도메인 목록을 내보낼 수 있습니다",
        open: "열기"
      },
      adminPanel: {
        statsTitle: "플랫폼 통계",
        statsDesc: "비민감 집계 데이터만 표시",
        refresh: "새로고침",
        loading: "로딩 중...",
        statsLoadFailed: "통계 로드 실패",
        enableHint: "먼저 설정에서 버전을 여러 번 탭해 관리자 모드를 켜세요",
        usersTotal: "가입 사용자",
        domainsUnique: "수집된 도메인 수",
        weatherDebugLabel: "날씨 디버그",
        weatherDebugDesc: "날씨 디버그 패널 표시 (세션 전용)"
      },
      about: {
        label: "LeafTab 정보",
        desc: "버전 정보와 확장 소개",
        open: "열기",
        title: "LeafTab 정보",
        content: "LeafTab은 브라우저 새 탭 확장 프로그램입니다.\n바로가기 관리, 배경/날씨 표시, 클라우드 동기화 및 WebDAV 동기화를 제공합니다.",
        ackTitle: "감사의 글",
        ackDesc: "LeafTab은 다음 오픈 소스 라이브러리/리소스를 사용합니다(탭하면 열림):",
        frontend: "프론트엔드",
        backend: "백엔드",
        resources: "아이콘 및 리소스"
      }
    },
    changelog: {
      title: "업데이트 로그",
      description: "최근 버전 업데이트",
      version: "버전",
      date: "날짜",
      items: {
        release144TranslationPromptFix: "LeafTab을 열 때마다 나타날 수 있던 \"이 페이지를 번역하시겠습니까\" 브라우저 번역 안내를 수정했습니다",
        release144AboutQqGroup: "About LeafTab 팝업에 커뮤니티 QQ 그룹 번호를 추가해 피드백과 소통이 더 쉬워졌습니다",
        release144ReadmeCommunityEntry: "README에 커뮤니티 안내를 추가하고 1.4.4 릴리스 정보도 함께 정리했습니다",
        release143SyncFlowAlignment: "클라우드 동기화와 WebDAV 동기화 동작을 맞춰 북마크 차이가 위험하게 감지돼도 바로가기와 설정 동기화는 계속할 수 있게 했습니다",
        release143WebdavProviderPolish: "WebDAV 기본 제공 서비스에 Jianguoyun을 추가하고, 서비스 전환, 권한 승인, 키 확인, 최초 동기화 흐름을 다듬었습니다",
        release143SyncStatusPolish: "동기화 센터 상태, 동기화 범위 문구, 오류 처리를 정리해 잘못된 실패 표시나 상태 불일치를 줄였습니다",
        release142BookmarkSyncDecoupling: "북마크 동기화와 바로가기/설정 동기화 분리 이슈를 수정",
        release142DangerousSyncDialogPolish: "북마크 동기화 위험 차단 팝업과 안내 문구를 개선",
        release142SyncTestingBackupNotice: "데이터 동기화는 아직 테스트 단계입니다. 활성화 전에 백업을 권장합니다",
        release130DynamicEffectsOptimize: "전역 동적 효과 경험을 최적화하고 \"동적 효과 줄이기\" 토글 및 통합 모션 축소 동작을 추가",
        release130DynamicWallpaperTab: "새로운 \"다이내믹\" 배경 카테고리를 추가하고 Prism, Silk, Light Rays, Beams, Galaxy, Iridescence 미리보기/적용을 지원",
        release130ManualWeatherCity: "날씨 기능에서 도시를 수동으로 선택해 저장할 수 있어 위치 표시를 더 안정적으로 제어 가능",
        release129ModeUiRefactor: "파노라마 / 리듬 / 여백 3가지 모드 UI를 재구성하고 공용 컴포넌트로 분리해 중복 레거시 코드를 정리",
        release129WallpaperModalRefine: "배경화면 설정 팝업을 Bing / 날씨 / 색상 / 사용자 지정 4개 탭으로 재구성해 인터랙션과 레이아웃을 통일",
        release129ColorWallpaperGradients: "색상 배경화면(12개 그라데이션 프리셋)을 추가하고 그라데이션 강도, 색상 카드 모서리, 미리보기 시각 품질을 개선",
        release129MaskSliderByMode: "배경화면 마스크 투명도 슬라이더(0-100)를 추가하고, 현재 활성화된 배경 타입에서만 hover 시 표시",
        release129ContrastAndOpacityTune: "리듬/여백 모드 가독성 개선: 네 모서리 모듈 기본 50% 투명도, 바로가기 텍스트 그림자 강화, 라이트 모드 핵심 텍스트를 흰색으로 고정",
        release127CaptchaSessionFix: "온라인 회원가입에서 CAPTCHA가 자주 오판되던 문제를 수정(생성/검증을 동일 세션으로 처리)",
        release127ProxyCookieDefaults: "운영 환경 세션 기본값(프록시 신뢰 + 쿠키 정책)을 최적화해 확장 프로그램-백엔드 세션 안정성 향상",
        release127FirstLoginLocalFirst: "신규 사용자 첫 로그인 시 동기화 충돌 팝업 없이 로컬 우선으로 클라우드에 즉시 동기화",
        release127DeployScriptLibUpload: "백엔드 배포 스크립트의 server/lib 미업로드 문제를 수정하고 배포 시 환경변수 기본 보강을 추가",
        release126UnifiedCompareDialog: "클라우드 로그인 충돌 처리를 WebDAV와 통일하고, 대형 비교 팝업을 바로 표시",
        release126ConflictStrategyTabs: "상단 탭에서 \"클라우드 우선 / 로컬 우선 / 병합\" 전략을 전환 가능",
        release126ConflictPendingPersist: "팝업을 닫거나 페이지를 새로고침해도 미해결 충돌 상태를 보존하고 복원",
        release126ConflictFreezeAutoSync: "미해결 충돌이 있는 동안 자동 동기화를 일시 중지하고, 확인 후 재개",
        release126CompareUiRefine: "비교 상세 UI를 간결화(항목 외곽 컨테이너 제거, 설정과 동일한 탭 스타일 적용)",
        release125ImportLocalFirstSync: "로그인 상태에서 로컬 데이터를 가져오면 확인 즉시 클라우드에 동기화됩니다(로컬 우선)",
        release125ManualCloudLocalFirst: "클라우드 동기화 활성화 시 수동 \"지금 동기화\"는 충돌 팝업 없이 로컬 데이터를 바로 클라우드에 반영합니다",
        release125SyncSettingsUi: "클라우드/WebDAV 동기화 설정 UI 개선: 두 스위치의 래퍼를 제거하고 순서를 조정",
        release125WebdavCorsPermission: "WebDAV 동기화에 확장 백그라운드 프록시와 도메인별 런타임 권한 요청(HTTP/HTTPS 유지)을 추가해 CORS 호환성 개선",
        release125WebdavAuthHint: "WebDAV 인증 실패(401/403)를 감지해 계정/비밀번호 오류를 명확히 안내",
        release124UpdateNotice: "커뮤니티 빌드에 GitHub 새 버전 감지 및 업데이트 안내 팝업 추가 (Release 바로가기 지원)",
        release124Snooze24h: "“나중에” 선택 시 24시간 쿨다운을 추가해 반복 알림을 줄임",
        release124ChangelogEntry: "인앱 업데이트 로그에 1.2.4 항목을 추가하고 다국어 문구를 보완",
        release124ReleasePackaging: "zip 루트에 manifest.json이 포함되도록 표준 릴리스 패키징 스크립트 추가",
        release124FirefoxCompat: "Firefox 스토어 패키지 구조를 수정하고 manifest 호환 설정을 조정",
        release123WebdavAccessDialog: "WebDAV \"동기화 활성화\"를 로그인과 동일한 스타일의 전용 연결 다이얼로그로 변경",
        release123UnifiedSyncSettings: "클라우드/WebDAV 동기화 설정 UI를 통일하고 충돌 처리 드롭다운을 제거",
        release123AutoSyncToggles: "자동 동기화 스위치와 자동 동기화 성공 토스트 스위치를 추가하고, 자동 동기화 OFF 시 간격 슬라이더를 비활성화",
        release123ProviderLabel: "WebDAV 카드 제목을 \"기본 설정\" 대신 서비스 제공자 이름으로 표시",
        release123PasswordToggle: "로그인/회원가입 비밀번호 입력에 표시/숨기기 토글 추가",
        release122Scrollbar: "About LeafTab 모달 스크롤바를 설정 모달과 동일한 스타일로 통일",
        release122WelcomePersist: "최초 로그인 안내 모달 상태를 로컬+서버에 저장해 새로고침 깜빡임 제거",
        release122RateLimitToast: "429 제한 토스트가 보이지 않던 문제를 수정하고 스타일을 통일",
        release122WebdavSchedule: "WebDAV 예약 동기화를 시스템 시간 기준으로 변경하고 다음 동기화 시간 표시 및 주요 설정 변경 시 즉시 동기화 지원",
        release122CustomServer: "커스텀 클라우드 동기화 서버 전환 지원",
        release122CustomIconSource: "커스텀 아이콘 소스 URL 지원",
        release122OnlineIconSource: "아이콘 소스를 GitHub Pages 기반 온라인 가져오기 방식으로 변경",
        release122DynamicAccent: "동적 포인트 컬러 지원 추가",
        release121Webdav: "WebDAV 동기화 기능 추가",
        release121Ui: "UI 스타일 개선",
        release121Fixes: "여러 버그 수정",
        grid: "하단 바로가기 영역을 평면 그리드로 재설계",
        carousel: "스와이프 페이지 및 마우스 휠 페이지 추가",
        entrance: "배경/검색/바로가기의 등장 애니메이션 개선",
        dots: "페이지 점 중앙 정렬 및 스타일 개선"
      }
    },
    updateNotice: {
      title: "새 버전 {{version}} 사용 가능",
      description: "GitHub에 더 새로운 커뮤니티 빌드가 있습니다.",
      currentVersion: "현재 버전",
      latestVersion: "최신 버전",
      publishedAt: "배포일: {{date}}",
      changelogTitle: "변경 사항",
      noChangelog: "이 버전에 대한 상세 릴리스 노트가 없습니다.",
      later: "나중에",
      ignoreThisVersion: "이 버전 무시",
      downloadFromGithub: "GitHub에서 다운로드"
    },
    languages: {
      zh: "简体中文",
      "zh-TW": "繁體中文",
      en: "English",
      vi: "Tiếng Việt",
      ja: "日本語",
      ko: "한국어"
    },
    weather: {
      refreshing: "날씨 및 위치 업데이트 중...",
      unknown: "알 수 없음",
      codes: {
        0: "맑음",
        1: "맑음",
        2: "구름 조금",
        3: "흐림",
        45: "안개",
        52: "안개",
        51: "이슬비",
        53: "이슬비",
        54: "강한 이슬비",
        55: "강한 이슬비",
        56: "어는 이슬비",
        57: "어는 이슬비",
        58: "약한 비",
        61: "약한 비",
        63: "비",
        65: "강한 비",
        66: "어는 비",
        67: "어는 비",
        71: "약한 눈",
        73: "눈",
        75: "강한 눈",
        77: "싸락눈",
        80: "소나기",
        81: "소나기",
        82: "강한 소나기",
        85: "소나기 눈",
        86: "소나기 눈",
        95: "뇌우",
        96: "우박을 동반한 뇌우",
        99: "우박을 동반한 뇌우"
      },
      defaultCity: "항저우",
      defaultWeather: "구름 조금",
      unknownLocation: "알 수 없는 위치",
      local: "현지"
    },
    lunar: {
      label: "음력"
    },
    common: {
      loading: "로딩 중...",
      cancel: "취소",
      confirm: "확인",
      delete: "삭제",
      save: "저장",
      clear: "지우기",
      back: "뒤로",
      more: "더보기"
    },
    user: {
      loggedIn: "로그인됨",
      logout: "로그아웃",
      loggedOut: "로그아웃됨"
    },
    search: {
      placeholder: "찾고 싶은 내용을 바로 입력하세요",
      placeholderDynamic: "찾고 싶은 내용을 입력하세요. 주소도 가능해요",
      placeholderHintTabSwitch: "검색 방식을 바꾸려면 Tab",
      placeholderHintCalculator: "12*8 처럼 입력하면 바로 계산돼요",
      placeholderHintSiteDirect: "github react 를 입력하면 GitHub에서 찾을 수 있어요",
      placeholderHintPrefix: "g AI 를 입력하면 Google로 검색돼요",
      systemEngine: "시스템 기본",
      useEngineSearch: "{{engine}}로 검색",
      prefixEngineInlineHint: "{{engine}}로 검색",
      historyTitle: "검색 기록",
      clearHistory: "지우기",
      noHistory: "검색 기록 없음"
    },
    groups: {
      edit: "편집",
      addShortcut: "새 바로가기"
    },
    context: {
      open: "열기",
      edit: "편집",
      copyLink: "링크 복사",
      delete: "삭제",
      addShortcut: "바로가기 추가",
      newShortcut: "새 바로가기",
      pinToTop: "고정"
    },
    sidebar: {
      toggle: "사이드바 전환",
      title: "사이드바",
      description: "모바일 사이드바를 표시합니다."
    },
    shortcutModal: {
      addTitle: "바로가기 추가",
      editTitle: "바로가기 편집",
      nameLabel: "이름",
      namePlaceholder: "바로가기 이름 입력",
      urlLabel: "URL",
      urlPlaceholder: "URL 입력",
      errors: {
        fillAll: "모든 정보를 입력해주세요",
        fillAllDesc: "바로가기 이름과 URL을 입력해주세요",
        duplicateUrl: "이 사이트의 바로가기가 이미 존재합니다",
        duplicateUrlDesc: "같은 사이트에는 바로가기 1개만 허용됩니다. URL을 확인해 주세요"
      }
    },
    onboarding: {
      welcome: "LeafTab에 오신 것을 환영합니다",
      selectRole: "역할을 선택하여 개인화된 경험 시작",
      skip: "건너뛰기",
      start: "시작하기",
      next: "다음",
      layoutTip: "레이아웃은 나중에 설정에서 변경할 수 있습니다",
      stepAppearanceTitle: "테마와 언어 설정",
      stepAppearanceDesc: "외관과 언어를 선택합니다. 나중에 설정에서 변경할 수 있습니다",
      stepRoleTitle: "역할 선택",
      stepRoleDesc: "추천 바로가기와 레이아웃을 초기화합니다",
      stepLayoutTitle: "레이아웃 선택",
      stepLayoutDesc: "홈 화면의 배치를 결정합니다",
      stepPermissionsTitle: "권한 허용",
      stepPermissionsDesc: "방문 기록과 북마크 권한을 허용하면 검색 경험이 더 완전해집니다",
      historyPermissionTitle: "방문 기록",
      historyPermissionDesc: "허용하면 최근 방문 기록과 관련 검색 제안을 LeafTab에서 표시할 수 있습니다",
      bookmarksPermissionTitle: "북마크",
      bookmarksPermissionDesc: "허용하면 브라우저 북마크를 바로 검색하고 열 수 있습니다",
      tabsPermissionTitle: "브라우저 탭",
      tabsPermissionDesc: "허용하면 열린 탭 검색과 LeafTab 중복 새 탭 방지를 사용할 수 있습니다",
      authorize: "권한 허용",
      authorizing: "요청 중...",
      authorized: "허용됨",
      unsupported: "지원 안 함",
      permissionTip: "이 단계는 건너뛸 수 있으며, 필요할 때 나중에 다시 권한을 허용할 수 있습니다.",
      enterHome: "LeafTab 시작하기"
    },
    auth: {
      description: "로그인하거나 가입하여 개인 설정을 저장하세요.",
      tabs: { login: "로그인", register: "가입" },
      labels: { username: "사용자 이름", password: "비밀번호", captcha: "인증 코드" },
      placeholders: {
        usernameInput: "사용자 이름 입력",
        passwordInput: "비밀번호 입력",
        usernameSet: "사용자 이름 설정",
        passwordSet: "비밀번호 설정",
        captchaInput: "인증 코드 입력"
      },
      tips: {
        username: "영문, 숫자, 이메일 형식, 길이 2-32자",
        password: "비밀번호는 8-24자여야 합니다",
        refreshCaptcha: "클릭하여 새로고침"
      },
      buttons: {
        loggingIn: "로그인 중...",
        login: "로그인",
        registering: "가입 중...",
        register: "가입"
      },
      toast: {
        loginSuccess: "로그인 성공! 환영합니다, {{username}}",
        registerSuccess: "가입 성공! 로그인해주세요, {{username}}"
      },
      errors: {
        usernamePasswordRequired: "사용자 이름과 비밀번호를 입력해주세요",
        captchaRequired: "인증 코드를 입력해주세요",
        usernameFormatInvalid: "사용자 이름 형식이 잘못되었습니다",
        passwordLength: "비밀번호는 8-24자여야 합니다",
        loginFailed: "로그인 실패",
        registerFailed: "가입 실패",
        loginRequestFailed: "로그인 요청 실패. 네트워크 또는 서버를 확인해주세요.",
        registerRequestFailed: "가입 요청 실패. 네트워크 또는 서버를 확인해주세요.",
        userExists: "사용자 이름이 이미 존재합니다",
        userNotFound: "사용자를 찾을 수 없습니다",
        invalidPassword: "비밀번호가 틀렸습니다",
        invalidCredentials: "사용자 이름 또는 비밀번호가 올바르지 않습니다",
        invalidUsernameFormatBackend: "사용자 이름 형식이 잘못되었습니다 (3-20자 영숫자 및 밑줄)",
        passwordTooShort: "비밀번호가 너무 짧습니다 (최소 6자)",
        credentialsRequired: "사용자 이름과 비밀번호를 입력해주세요",
        invalidCaptcha: "인증 코드가 올바르지 않습니다",
        internalError: "서버 내부 오류"
      }
    },
    shortcutDelete: {
      title: "바로가기 삭제",
      description: "이 바로가기를 삭제하시겠습니까?"
    },
    syncConflict: {
      title: "동기화 충돌",
      description: "로컬 및 클라우드 바로가기가 일치하지 않습니다. 사용할 버전을 선택해주세요.",
      useCloud: "클라우드 사용",
      useLocal: "로컬 사용"
    },
    scenario: {
      title: "시나리오 모드",
      defaultName: "Working mode",
      createTitle: "새 시나리오",
      createDescription: "이름, 색상 및 아이콘 설정",
      editTitle: "시나리오 편집",
      editDescription: "이름, 색상 및 아이콘 변경",
      nameLabel: "시나리오 이름",
      namePlaceholder: "시나리오 이름 입력",
      colorLabel: "색상",
      iconLabel: "아이콘",
      createButton: "시나리오 생성",
      addButton: "추가",
      saveButton: "저장",
      deleteTitle: "시나리오 삭제",
      deleteConfirm: "이 시나리오를 삭제하시겠습니까? 이 모드의 모든 그룹과 바로가기가 삭제되며 복구할 수 없습니다.",
      deleteConfirmWithTarget: "「{{name}}」을(를) 삭제하시겠습니까? 이 모드의 모든 그룹과 바로가기가 삭제되며 복구할 수 없습니다.",
      deleteButton: "삭제",
      toast: {
        created: "시나리오가 생성되었습니다",
        updated: "시나리오가 업데이트되었습니다",
        deleted: "시나리오가 삭제되었습니다",
        switched: "{{name}}(으)로 전환됨"
      }
    },
    leaftabSyncCenter: {
      title: "동기화 센터",
      description: "WebDAV 기반 동기화 센터로, 시나리오/바로가기/북마크 동기화를 지원합니다.",
      bookmarkScope: "북마크 동기화 범위: {{scope}}",
      summary: "바로가기 {{shortcuts}}개, 시나리오 {{scenarios}}개, 북마크 {{bookmarks}}개",
      stateLabel: "상태",
      nav: {
        syncing: "동기화 중",
        attention: "확인 필요"
      },
      status: {
        syncing: "동기화 중",
        conflict: "처리 필요",
        error: "실패",
        ready: "준비됨"
      },
      state: {
        analyzing: "동기화 상태 분석 중...",
        syncing: "백그라운드 동기화 중",
        syncingDescription: "LeafTab이 로컬과 원격 차이를 비교하고 변경 사항을 반영하고 있습니다. 완료될 때까지 기다려 주세요.",
        initRequired: "초기화 필요",
        initDescription: "로컬과 원격 모두에 데이터가 있습니다. 먼저 초기화 방식을 선택한 뒤 동기화를 시작하세요.",
        ready: "병합 동기화 준비됨",
        readyDescription: "새 동기화 엔진은 시나리오/바로가기/브라우저 북마크에 대해 push·pull·병합 동기화를 지원합니다."
      },
      actions: {
        syncing: "동기화 중..."
      }
    },
    leaftabSyncDialog: {
      description: "LeafTab 동기화 상태, 수동 동기화, WebDAV 설정을 여기서 관리합니다.",
      scopeDefault: "북마크",
      lastSyncEmpty: "기록 없음",
      lastSyncUnavailable: "미동기화",
      manualSyncOnly: "현재는 수동 동기화만 가능",
      autoSyncOn: "자동 동기화가 켜져 있습니다",
      enableSync: "동기화 활성화",
      repair: "동기화 복구",
      cloudOverwriteLocal: "클라우드가 로컬을 덮어쓰기",
      localOverwriteCloud: "로컬이 클라우드를 덮어쓰기",
      remoteOverwriteLocal: "WebDAV가 로컬을 덮어쓰기",
      localOverwriteRemote: "로컬이 WebDAV를 덮어쓰기",
      tabs: {
        cloud: "클라우드",
        webdav: "WebDAV"
      },
      metrics: {
        localShortcuts: "로컬 바로가기",
        localBookmarks: "로컬 북마크",
        remoteShortcuts: "원격 바로가기",
        remoteBookmarks: "원격 북마크"
      },
      details: {
        lastSync: "마지막 동기화",
        nextSync: "다음 동기화",
        scope: "동기화 범위"
      },
      cloud: {
        bookmarkSyncDisabledBanner: "북마크 동기화가 꺼져 있습니다. 현재는 바로가기와 설정만 동기화됩니다.",
        enableBookmarkSyncAction: "켜기",
        connectedFallback: "LeafTab 계정",
        unsignedTitle: "로그인 필요",
        unsignedSubtitle: "로그인하여 데이터를 동기화",
        loginToStart: "로그인 후 설정",
        signedOut: "로그아웃됨",
        connectedSubtitle: "로그인됨, LeafTab 데이터 동기화 가능",
        disabledSubtitle: "로그인됨, 클라우드 설정에서 동기화를 켤 수 있습니다",
        openSettingsToEnable: "켜기",
        ready: "연결됨",
        disabled: "비활성",
        error: "실패",
        enableViaSettings: "동기화 켜기",
        manage: "클라우드 동기화 관리",
        scopeRich: "바로가기, {{scope}}",
        scopeShortcutsOnly: "바로가기와 설정만"
      },
      webdav: {
        connectedFallback: "WebDAV",
        unconfiguredTitle: "WebDAV 미사용",
        unconfiguredSubtitle: "미설정 상태입니다. 먼저 설정해 주세요.",
        enabledSubtitle: "설정됨, WebDAV로 동기화합니다",
        disabledSubtitle: "설정됨, 동기화가 비활성입니다",
        configureToStart: "설정 후 시작",
        enableToStart: "설정됨, 활성화 필요",
        scopeWithLabel: "바로가기, {{scope}}"
      }
    },
    leaftabSyncEncryption: {
      cloudNotEnabledTitle: "클라우드 동기화가 꺼져 있습니다",
      cloudNotEnabledPill: "꺼짐",
      webdavNotEnabledTitle: "WebDAV 동기화가 꺼져 있습니다",
      webdavNotEnabledPill: "꺼짐",
      statusReadyTitle: "종단간 암호화가 켜져 있습니다",
      statusMissingTitle: "동기화 암호문구가 설정되지 않았습니다",
      statusReadyPill: "보호됨",
      statusMissingPill: "미설정",
      setupTitle: "동기화 암호문구 설정",
      unlockTitle: "동기화 암호문구 입력",
      setupDescription: "{{provider}}에 사용할 종단간 암호화 암호문구를 설정합니다. 서버는 동기화 내용을 볼 수 없고 이 암호문구도 복구할 수 없습니다.",
      unlockDescription: "{{provider}}의 동기화 암호문구를 입력해 암호화된 데이터를 이 기기에서 해독합니다.",
      setupConfirm: "저장",
      unlockConfirm: "동기화 해제",
      e2eeSetupDescription: "데이터는 로컬에서 암호화된 후 클라우드/WebDAV로 업로드됩니다. 이 암호문구를 가진 기기만 해독할 수 있습니다.",
      e2eeUnlockDescription: "동기화 데이터는 클라우드에 암호화된 형태로 저장됩니다. 올바른 암호문구를 입력하면 이 기기에서 해독해 읽을 수 있습니다.",
      passphraseLabel: "동기화 암호문구",
      passphrasePlaceholder: "최소 8자, 영문/숫자 조합 권장",
      passphraseHint: "계정 로그인 비밀번호가 아니라 동기화 전용 암호문구입니다.",
      confirmLabel: "암호문구 확인",
      confirmPlaceholder: "다시 입력하여 확인",
      setupChecklistTitle: "계속하기 전에 확인하세요",
      checklist: {
        serverCannotAccess: "이 암호문구는 저장되지 않으며, 암호화된 동기화 내용도 볼 수 없습니다.",
        cannotRecover: "암호문구를 잊어버리면 기존 암호화 동기화 데이터는 복구할 수 없습니다.",
        newDeviceUnlock: "기기를 변경하거나 로컬 데이터를 지우면 다시 입력해야 합니다."
      },
      deviceUnlockDescription: "이 기기에서 한 번 해제하면 이후 동기화에서는 다시 입력할 필요가 없습니다."
    },
    toast: {
      cloudSynced: "클라우드 설정 동기화됨",
      cloudAutoSyncSuccess: "클라우드 자동 동기화 완료",
      cloudSyncFailed: "클라우드 설정 동기화 실패",
      syncFailed: "동기화 실패",
      syncCloudApplied: "클라우드 설정 적용됨",
      syncLocalApplied: "로컬 설정 적용됨",
      linkCopied: "링크가 복사되었습니다",
      linkCopyFailed: "링크 복사 실패",
      loadedFromCache: "로컬 캐시에서 로드됨 (오프라인 모드)",
      sessionExpired: "세션이 만료되었습니다. 다시 로그인해 주세요"
    }
  }
};
