export default {
  translation: {
    logoutConfirm: {
      title: "Đăng xuất",
      description: "Bạn có chắc muốn đăng xuất không? Các thay đổi cục bộ chưa đồng bộ có thể bị mất.",
      clearLocalLabel: "Xóa dữ liệu cục bộ và khôi phục mặc định",
      clearLocalDesc: "Khôi phục lối tắt cục bộ về cấu hình vai trò đã chọn",
      confirm: "Đăng xuất",
      cancel: "Hủy"
    },
    settings: {
      title: "Cài đặt",
      profile: {
        loggedInDesc: "Đã đăng nhập",
        daysActive: "Số ngày hoạt động",
        shortcutsCount: "Lối tắt",
        guest: "Khách",
        guestDesc: "Đăng nhập để đồng bộ dữ liệu"
      },
      newTabMode: {
        label: "Mở trong tab mới",
        description: "Các lối tắt mở trong tab mới theo mặc định"
      },
      searchEngineTabSwitch: {
        label: "Tab đổi công cụ tìm kiếm",
        description: "Khi ô tìm kiếm đang được focus, nhấn Tab để chuyển vòng giữa các công cụ tìm kiếm"
      },
      searchSettings: {
        label: "Cài đặt tìm kiếm",
        description: "Quản lý hành vi tìm kiếm và các tính năng tìm kiếm nhanh",
        open: "Mở",
        title: "Cài đặt tìm kiếm",
        items: {
          tabSwitch: {
            label: "Tab đổi công cụ tìm kiếm",
            description: "Nhấn Tab trong ô tìm kiếm để chuyển công cụ",
            tooltip: "Khi ô tìm kiếm được focus, dùng Tab / Shift+Tab để chuyển nhanh công cụ tìm kiếm."
          },
          prefix: {
            label: "Tìm kiếm Prefix",
            description: "Dùng tiền tố !g / !b / !d / !bd để đổi công cụ tạm thời",
            tooltip: "Ví dụ: `!g AI` sẽ tìm bằng Google cho truy vấn đó mà không đổi công cụ mặc định."
          },
          siteDirect: {
            label: "Tìm kiếm trực tiếp theo site",
            description: "Nhập `site + từ khóa` để ưu tiên mở trang tìm kiếm của chính site đó",
            tooltip: "Hỗ trợ các site phổ biến như GitHub, GitLab, Gitee, Zhihu, Bilibili, YouTube, Google, Bing, Baidu, Wikipedia, Reddit, Amazon... Ví dụ: `github react`."
          },
          siteShortcut: {
            label: "Gợi ý site nhanh",
            description: "Hiển thị gợi ý site tích hợp khi nhập tên trang",
            tooltip: "Ví dụ nhập `git` có thể ưu tiên GitHub / GitLab / Gitee."
          },
          anyKeyCapture: {
            label: "Gõ phím bất kỳ để tìm",
            description: "Mở tab mới và gõ trực tiếp để nhập vào ô tìm kiếm",
            tooltip: "Khi bật, nhấn phím ký tự ở vùng trống sẽ tự focus ô tìm kiếm và nhập nội dung."
          },
          calculator: {
            label: "Xem trước máy tính",
            description: "Hiển thị kết quả phép tính theo thời gian thực trong gợi ý",
            tooltip: "Ví dụ nhập `12*8` sẽ hiện kết quả ngay trong danh sách gợi ý."
          },
          rotatingPlaceholder: {
            label: "Gợi ý xoay vòng trong ô tìm kiếm",
            description: "Tự động đổi các câu gợi ý trong ô tìm kiếm",
            tooltip: "Khi tắt, ô tìm kiếm sẽ chỉ hiển thị một câu gợi ý cố định."
          },
          position: {
            label: "Vị trí ô tìm kiếm",
            description: "Chọn hiển thị ô tìm kiếm ở phía trên hoặc phía dưới khu vực lối tắt",
            tooltip: "Thay đổi sẽ áp dụng ngay và vị trí bạn chọn sẽ được ghi nhớ.",
            top: "Phía trên",
            bottom: "Phía dưới"
          }
        }
      },
      timeFormat: {
        label: "Định dạng 24 giờ",
        description: "Hiển thị thời gian ở định dạng 24 giờ"
      },
      showSeconds: {
        label: "Hiển thị giây",
        description: "Hiển thị giây trong thành phần thời gian"
      },
      visualEffectsLevel: {
        label: "Mức độ mượt",
        description: "Chọn cường độ hiệu ứng theo hiệu năng thiết bị",
        low: "Thấp",
        medium: "Trung bình",
        high: "Cao"
      },
      showTime: {
        label: "Hiển thị thời gian",
        description: "Hiển thị thời gian trên trang"
      },
      timeFont: {
        title: "Phông chữ thời gian",
        description: "Chọn phông chữ dùng để hiển thị thời gian"
      },
      autoFocusSearch: {
        label: "Tự động lấy nét hộp tìm kiếm",
        description: "Tự động tập trung vào hộp tìm kiếm khi vào trang"
      },
      language: {
        label: "Ngôn ngữ",
        description: "Chọn ngôn ngữ giao diện",
        selectPlaceholder: "Chọn ngôn ngữ"
      },
      theme: {
        label: "Giao diện",
        description: "Chuyển đổi giao diện sáng/tối hoặc theo hệ thống",
        selectPlaceholder: "Chọn giao diện",
        system: "Hệ thống",
        light: "Sáng",
        dark: "Tối"
      },
      accentColor: {
        label: "Màu chủ đạo",
        description: "Chọn màu chủ đạo cho ứng dụng"
      },
      accent: {
        dynamic: "Động",
        mono: "Đơn sắc",
        green: "Xanh lá",
        blue: "Xanh dương",
        purple: "Tím",
        orange: "Cam",
        pink: "Hồng",
        red: "Đỏ"
      },
      displayMode: {
        title: "Chế độ hiển thị",
        description: "Chọn kiểu bố cục trang",
        blank: "Trống",
        blankDesc: "Ẩn thời gian, hình nền và lối tắt",
        rhythm: "Nhịp điệu",
        rhythmDesc: "Chỉ giữ tìm kiếm và lối tắt"
      },
      shortcutsLayout: {
        label: "Mật độ lối tắt",
        description: "Điều chỉnh số lối tắt mỗi cột",
        set: "Thiết lập",
        select: "Chọn"
      },
      shortcutsStyle: {
        label: "Kiểu lối tắt",
        entryDescription: "Đổi kiểu hiển thị và đặt số cột, số hàng cơ sở của lưới",
        open: "Mở",
        title: "Cài đặt kiểu lối tắt",
        description: "Chọn kiểu lối tắt và đặt số cột cùng số hàng cơ sở cho lưới một trang",
        rich: "Đầy đủ",
        compact: "Tối giản",
        showName: "Hiện tên",
        showNameDesc: "Bật để hiển thị tiêu đề lối tắt dưới biểu tượng",
        columns: "Số cột",
        rows: "Số hàng cơ sở"
      },
	      backup: {
        label: "Sao lưu & khôi phục dữ liệu",
        description: "Nhập hoặc xuất dữ liệu bố cục cục bộ (.leaftab)",
        cloudTab: "Đồng bộ đám mây",
        webdavTab: "Đồng bộ WebDAV",
        import: "Nhập dữ liệu",
        export: "Xuất dữ liệu",
        importSuccess: "Nhập dữ liệu thành công",
        importError: "Nhập dữ liệu thất bại, vui lòng kiểm tra định dạng tệp",
        exportSuccess: "Xuất dữ liệu thành công",
        progress: {
          importPreparingTitle: "Chuẩn bị nhập dữ liệu",
          importPreparingDetail: "Đang kiểm tra tệp sao lưu...",
          importReadingLocalTitle: "Đang đọc dữ liệu cục bộ hiện tại",
          importReadingLocalDetail: "Đang chuẩn bị hợp nhất nội dung đã nhập...",
          importWritingLocalTitle: "Đang ghi dữ liệu cục bộ",
          importWritingLocalDetail: "Đang áp dụng dữ liệu đã nhập vào thiết bị...",
          importMergingTitle: "Đang hợp nhất dữ liệu đã nhập",
          importMergingDetail: "Đang đồng bộ trạng thái lối tắt và dấu trang...",
          importSyncingTitle: "Đang đồng bộ dữ liệu đã nhập",
          importSyncingDetail: "Đang tải dữ liệu mới nhất lên đám mây...",
          importLongTaskTitle: "Đang nhập dữ liệu",
          importLongTaskDetail: "Đang ghi dữ liệu cục bộ, vui lòng chờ...",

          exportLongTaskTitle: "Đang xuất dữ liệu",
          exportLongTaskDetail: "Đang chuẩn bị lối tắt và dấu trang...",
          exportReadingLocalTitle: "Đang đọc dữ liệu cục bộ",
          exportReadingLocalDetail: "Đang thu thập lối tắt và dấu trang...",
          exportAssemblingTitle: "Đang đóng gói dữ liệu xuất",
          exportAssemblingDetail: "Đang tạo tệp sao lưu LeafTab...",
          exportGeneratingTitle: "Đang tạo tệp xuất",
          exportGeneratingDetail: "Sắp sẵn sàng để lưu...",

          cloudBackupLongTaskTitle: "Đang sao lưu dữ liệu đám mây",
          cloudBackupLongTaskDetail: "Đang tải bản sao lưu trước khi nhập...",
          cloudBackupReadingTitle: "Đang đọc dữ liệu đám mây",
          cloudBackupReadingDetail: "Đang tạo bản sao lưu trước khi nhập để tránh ghi đè...",
          cloudBackupImportingTitle: "Đang nhập dữ liệu sao lưu",
          cloudBackupImportingDetail: "Đang ghi dữ liệu bạn chọn vào thiết bị...",
        },
	        webdav: {
          entry: "Đồng bộ WebDAV",
          entryDesc: "Cấu hình sao lưu & khôi phục từ xa qua WebDAV",
          configure: "Cấu hình",
          providers: {
            jianguoyun: "Jianguoyun",
          },
          pull: "Kéo từ đám mây",
          push: "Đẩy lên đám mây",
          sync: "Đồng bộ ngay",
          url: "URL WebDAV",
          filePath: "Đường dẫn tệp từ xa",
          username: "Tên người dùng",
          password: "Mật khẩu",
          profileName: "Tên cấu hình",
          profileNamePlaceholder: "vd: NAS gia đình",
          usernamePlaceholder: "Tùy chọn",
          passwordPlaceholder: "Tùy chọn",
          syncByScheduleLabel: "Tự động đồng bộ theo lịch",
          syncByScheduleDesc: "Đồng bộ theo khoảng thời gian cố định, phù hợp mở trang lâu",
          autoSyncToastLabel: "Thông báo khi tự động đồng bộ thành công",
          autoSyncToastDesc: "Hiển thị toast sau khi đồng bộ tự động theo lịch thành công",
          syncIntervalLabel: "Khoảng thời gian đồng bộ",
          policyMerge: "Cố gắng hợp nhất thay đổi cục bộ và đám mây (khuyến nghị)",
          policyPreferRemote: "Ưu tiên giữ phiên bản đám mây (ghi đè bản cục bộ)",
          policyPreferLocal: "Ưu tiên giữ phiên bản cục bộ (ghi đè bản đám mây)",
          download: "Kéo từ WebDAV",
          upload: "Đồng bộ lên WebDAV",
          downloading: "Đang kéo...",
          uploading: "Đang đồng bộ...",
          downloadSuccess: "Kéo WebDAV thành công",
          uploadSuccess: "Đồng bộ WebDAV thành công",
          downloadError: "Kéo WebDAV thất bại, hãy kiểm tra cấu hình",
          uploadError: "Đồng bộ WebDAV thất bại, hãy kiểm tra cấu hình",
          syncSuccess: "Đồng bộ hoàn tất",
          syncError: "Đồng bộ thất bại, hãy kiểm tra cấu hình",
	          authFailed: "Xác thực WebDAV thất bại, hãy kiểm tra tài khoản hoặc mật khẩu",
	          policyChangeSyncTriggered: "Đã đổi chính sách xung đột và đồng bộ một lần theo chính sách hiện tại",
	          intervalChangeSyncTriggered: "Đã đổi khoảng thời gian đồng bộ và đồng bộ ngay một lần",
	          disableWebdavBeforeCloudLogin: "WebDAV đang được bật. Hãy tắt đồng bộ WebDAV trước khi đăng nhập đồng bộ đám mây.",
	          disableWebdavBeforeCloudManage: "WebDAV đang được bật. Hãy tắt đồng bộ WebDAV trước khi quản lý đồng bộ đám mây.",
	          disableCloudBeforeWebdavEnable: "Bạn đang đăng nhập đồng bộ đám mây. Hãy đăng xuất trước khi bật đồng bộ WebDAV.",
	          disableCloudBeforeWebdavConfig: "Đồng bộ đám mây đang bật. Hãy tắt đồng bộ đám mây trước khi cấu hình WebDAV.",
	          urlRequired: "Vui lòng nhập URL WebDAV trước",
	          defaultProfileName: "Cấu hình mặc định",
	          configured: "Đã cấu hình, sẵn sàng đồng bộ",
	          notConfigured: "Chưa cấu hình, vui lòng nhập thông tin WebDAV",
          disabled: "Đã tắt, đồng bộ WebDAV đã dừng",
          lastSyncAt: "Lần đồng bộ gần nhất",
          notSynced: "Chưa đồng bộ",
          justSynced: "Vừa đồng bộ",
          minutesAgo: "{{count}} phút trước",
          hoursAgo: "{{count}} giờ trước",
          lastAttemptFailed: "Lần đồng bộ gần nhất thất bại",
          scheduleRunning: "Đang chạy đồng bộ theo lịch",
          nextSyncAtLabel: "Lần đồng bộ tiếp theo: {{time}}",
          syncDisabled: "Vui lòng bật đồng bộ WebDAV trước"
        }
      },
      changelog: {
        title: "Nhật ký cập nhật",
        description: "Xem các cập nhật tính năng và trải nghiệm gần đây",
        open: "Xem nhật ký"
      },
      privacyPolicy: "Chính sách quyền riêng tư",
      copyright: "Bảo lưu mọi quyền.",
      specialThanks: "Đặc biệt cảm ơn những người thử nghiệm: yanshuai, Horang, Mling",
      iconAssistant: {
        title: "Gửi thống kê sử dụng ẩn danh",
        desc: "Giúp chúng tôi tối ưu hóa hỗ trợ biểu tượng (chỉ tên miền, không có thông tin cá nhân)",
        modalTitle: "Giúp cải thiện LeafTab",
        modalDesc: "Để cung cấp hỗ trợ biểu tượng tốt hơn, chúng tôi muốn thu thập tên miền của các lối tắt của bạn (ví dụ: google.com). Dữ liệu hoàn toàn ẩn danh và không chứa thông tin cá nhân hoặc URL đầy đủ.",
        agree: "Đồng ý và Bật",
        disagree: "Không đồng ý",
        adminKeyLabel: "Khóa quản trị",
        adminKeyDesc: "Dùng để xuất danh sách tên miền toàn hệ thống (chỉ dành cho quản trị viên/self-hosting)",
        adminKeyPlaceholder: "Nhập khóa quản trị",
        adminKeySave: "Lưu",
        adminKeyClear: "Xóa",
        adminKeySaved: "Đã lưu khóa quản trị",
        adminKeyCleared: "Đã xóa khóa quản trị",
        adminKeyRequired: "Cần khóa quản trị",
        adminKeyInvalid: "Khóa quản trị không hợp lệ hoặc không có quyền",
        confirmClose: "Tắt sẽ ngừng ưu tiên hỗ trợ biểu tượng. Xác nhận tắt?",
        downloadTitle: "Tải danh sách tên miền đã thu thập",
        downloadDesc: "Chỉ tên miền, đã loại trùng, loại trừ các biểu tượng đã có",
        downloadButton: "Tải danh sách",
        reportNow: "Báo cáo ngay",
        reportTriggered: "Đã kích hoạt báo cáo (có thể bị giới hạn tần suất)",
        queueStatus: "Đang chờ: {{count}}, lần báo cáo gần nhất: {{last}}",
        downloadSuccess: "Đã tải danh sách tên miền",
        downloadFailed: "Tải thất bại, vui lòng thử lại"
      },
      adminMode: {
        tapRemaining: "Chạm thêm {{count}} lần để vào chế độ quản trị",
        enabled: "Đã bật chế độ quản trị",
        alreadyEnabled: "Bạn đang ở chế độ quản trị",
        disabled: "Đã tắt chế độ quản trị",
        switchLabel: "Chế độ quản trị",
        switchDesc: "Bật để cấu hình khóa quản trị và xuất danh sách tên miền toàn hệ thống",
        open: "Mở"
      },
      adminPanel: {
        statsTitle: "Thống kê nền tảng",
        statsDesc: "Chỉ số tổng hợp, không nhạy cảm",
        refresh: "Làm mới",
        loading: "Đang tải...",
        statsLoadFailed: "Tải thống kê thất bại",
        enableHint: "Hãy bật chế độ quản trị bằng cách chạm phiên bản trong Cài đặt trước",
        usersTotal: "Người dùng đăng ký",
        domainsUnique: "Số tên miền",
        weatherDebugLabel: "Gỡ lỗi thời tiết",
        weatherDebugDesc: "Hiện bảng gỡ lỗi thời tiết (chỉ phiên hiện tại)"
      },
      about: {
        label: "Giới thiệu LeafTab",
        desc: "Xem phiên bản và giới thiệu tiện ích",
        open: "Mở",
        title: "Giới thiệu LeafTab",
        versionLabel: "Phiên bản v{{version}}",
        content: "LeafTab là tiện ích trang tab mới của trình duyệt.\nCung cấp trang bắt đầu gọn gàng với lối tắt, hình nền/thời tiết và các tính năng đồng bộ như Cloud Sync và WebDAV.",
        ackTitle: "Ghi nhận",
        ackDesc: "LeafTab sử dụng các thư viện và tài nguyên mã nguồn mở sau (chạm để mở):",
        frontend: "Frontend",
        backend: "Backend",
        resources: "Biểu tượng & Tài nguyên"
      }
    },
    changelog: {
      title: "Nhật ký cập nhật",
      description: "Các cập nhật phiên bản gần đây",
      version: "Phiên bản",
      date: "Ngày",
      items: {
        release144TranslationPromptFix: "Đã sửa lời nhắc dịch trình duyệt có thể xuất hiện mỗi lần mở LeafTab",
        release144AboutQqGroup: "Đã thêm số nhóm QQ cộng đồng vào hộp thoại About LeafTab để tiện phản hồi và trao đổi",
        release144ReadmeCommunityEntry: "Đã bổ sung mục cộng đồng trong README và đồng bộ lại thông tin phát hành 1.4.4",
        release143SyncFlowAlignment: "Đồng bộ hóa logic giữa cloud sync và WebDAV sync để vẫn có thể tiếp tục đồng bộ phím tắt và cài đặt khi chênh lệch bookmark bị xem là rủi ro",
        release143WebdavProviderPolish: "Thêm Jianguoyun thành nhà cung cấp WebDAV tích hợp sẵn và hoàn thiện luồng chuyển nhà cung cấp, cấp quyền, kiểm tra khóa và đồng bộ lần đầu",
        release143SyncStatusPolish: "Tinh chỉnh trạng thái trong trung tâm đồng bộ, mô tả phạm vi đồng bộ và xử lý lỗi để giảm báo lỗi sai hoặc trạng thái không đồng bộ",
        release130DynamicEffectsOptimize: "Tối ưu trải nghiệm hiệu ứng động toàn cục với công tắc Giảm hiệu ứng động và cơ chế giảm chuyển động thống nhất",
        release130DynamicWallpaperTab: "Thêm tab hình nền Động mới, hỗ trợ xem trước và áp dụng Prism, Silk, Light Rays, Beams, Galaxy, Iridescence",
        release130ManualWeatherCity: "Tính năng thời tiết nay hỗ trợ chọn thủ công thành phố và lưu lại để hiển thị vị trí ổn định hơn",
        release129ModeUiRefactor: "Tái cấu trúc UI cho 2 chế độ Nhịp điệu / Khoảng trắng, tách component dùng chung và dọn mã trùng lặp cũ",
        release129WallpaperModalRefine: "Thiết kế lại popup cài đặt hình nền thành 4 tab thống nhất: Bing / Thời tiết / Màu sắc / Tùy chỉnh",
        release129ColorWallpaperGradients: "Thêm hình nền màu (12 preset gradient) và tối ưu độ chuyển màu, bo góc ô màu, cùng chất lượng phần xem trước",
        release129MaskSliderByMode: "Thêm thanh trượt độ mờ lớp phủ nền (0-100), chỉ hiện khi hover và chỉ cho loại hình nền đang được áp dụng",
        release129ContrastAndOpacityTune: "Cải thiện khả năng đọc ở chế độ Nhịp điệu/Khoảng trắng: module bốn góc mặc định 50% opacity, tăng bóng chữ lối tắt, và giữ chữ chính màu trắng ở giao diện sáng",
        release127CaptchaSessionFix: "Sửa lỗi captcha bị báo sai thường xuyên khi đăng ký online bằng cách đảm bảo tạo captcha và kiểm tra đăng ký dùng cùng một session",
        release127ProxyCookieDefaults: "Tối ưu mặc định session ở production (trust proxy + chính sách cookie) để ổn định phiên từ extension tới backend",
        release127FirstLoginLocalFirst: "Người dùng mới đăng nhập lần đầu sẽ không còn popup xung đột, dữ liệu local được đồng bộ lên cloud theo ưu tiên local",
        release127DeployScriptLibUpload: "Sửa script deploy backend chưa upload server/lib và tăng cường bổ sung biến môi trường mặc định khi triển khai",
        release126UnifiedCompareDialog: "Thống nhất luồng xử lý xung đột khi đăng nhập cloud với WebDAV, mở thẳng popup so sánh lớn",
        release126ConflictStrategyTabs: "Thêm Tabs phía trên để chuyển nhanh chiến lược: Ưu tiên cloud / Ưu tiên local / Gộp",
        release126ConflictPendingPersist: "Khi đóng popup hoặc tải lại trang, xung đột chưa xử lý sẽ được giữ lại và khôi phục",
        release126ConflictFreezeAutoSync: "Tự động đồng bộ sẽ tạm dừng khi còn xung đột và tự khôi phục sau khi xác nhận",
        release126CompareUiRefine: "Tinh gọn UI danh sách so sánh: bỏ container bao ngoài từng mục và dùng style Tabs giống trang Cài đặt",
        release125ImportLocalFirstSync: "Khi đã đăng nhập, nhập dữ liệu cục bộ sẽ đồng bộ lên cloud ngay sau khi xác nhận (ưu tiên dữ liệu cục bộ)",
        release125ManualCloudLocalFirst: "Khi bật cloud sync, bấm đồng bộ thủ công sẽ bỏ qua popup xung đột và đẩy dữ liệu cục bộ lên cloud trực tiếp",
        release125SyncSettingsUi: "Tinh gọn UI cài đặt đồng bộ Cloud/WebDAV: bỏ lớp bọc thừa của hai công tắc và đổi thứ tự hiển thị",
        release125WebdavCorsPermission: "WebDAV bổ sung proxy nền của extension và xin quyền runtime theo từng domain (giữ HTTP/HTTPS) để cải thiện tương thích CORS",
        release125WebdavAuthHint: "Nhận diện lỗi xác thực WebDAV (401/403) và hiển thị rõ lỗi tài khoản/mật khẩu",
        release124UpdateNotice: "Thêm phát hiện phiên bản mới từ GitHub cho bản cộng đồng và popup cập nhật (mở thẳng Release)",
        release124Snooze24h: "Thêm cơ chế hoãn 24 giờ cho nút “Để sau” để tránh làm phiền lặp lại",
        release124ChangelogEntry: "Bổ sung mục 1.2.4 trong nhật ký cập nhật và hoàn thiện nội dung đa ngôn ngữ",
        release124ReleasePackaging: "Thêm script đóng gói phát hành chuẩn, zip có manifest.json ngay thư mục gốc",
        release124FirefoxCompat: "Sửa cấu trúc gói cho Firefox Store và điều chỉnh cấu hình tương thích manifest",
        release123WebdavAccessDialog: "Nút \"Bật đồng bộ\" WebDAV nay mở hộp thoại kết nối riêng với cùng phong cách như đăng nhập",
        release123UnifiedSyncSettings: "Thống nhất UI cài đặt đồng bộ Cloud/WebDAV và bỏ dropdown xử lý xung đột",
        release123AutoSyncToggles: "Thêm công tắc tự động đồng bộ và công tắc toast thành công; tắt tự động đồng bộ sẽ khóa thanh trượt khoảng thời gian",
        release123ProviderLabel: "Tiêu đề thẻ WebDAV giờ hiển thị tên nhà cung cấp thay vì \"Cấu hình mặc định\"",
        release123PasswordToggle: "Thêm nút hiện/ẩn mật khẩu ở ô mật khẩu đăng nhập/đăng ký",
        release122Scrollbar: "Đồng bộ kiểu thanh cuộn của modal About LeafTab với modal Cài đặt",
        release122WelcomePersist: "Lưu trạng thái modal chào mừng lần đăng nhập đầu ở local + server để tránh nháy khi refresh",
        release122RateLimitToast: "Sửa lỗi không hiển thị toast giới hạn 429 và đồng bộ kiểu hiển thị",
        release122WebdavSchedule: "Đồng bộ WebDAV theo lịch dựa trên giờ hệ thống, hiển thị lần đồng bộ kế tiếp và đồng bộ ngay khi đổi cấu hình quan trọng",
        release122CustomServer: "Hỗ trợ chuyển đổi máy chủ đồng bộ đám mây tùy chỉnh",
        release122CustomIconSource: "Hỗ trợ URL nguồn biểu tượng tùy chỉnh",
        release122OnlineIconSource: "Nguồn biểu tượng đổi sang lấy trực tuyến qua GitHub Pages",
        release122DynamicAccent: "Thêm hỗ trợ màu nhấn động",
        release121Webdav: "Thêm tính năng đồng bộ WebDAV",
        release121Ui: "Tinh chỉnh giao diện UI",
        release121Fixes: "Sửa một số lỗi",
        grid: "Khu vực lối tắt chuyển sang lưới phẳng",
        carousel: "Thêm vuốt phân trang và cuộn chuột để chuyển trang",
        entrance: "Tối ưu hiệu ứng vào cho nền, tìm kiếm, lối tắt",
        dots: "Căn giữa và tinh chỉnh chấm phân trang"
      }
    },
    updateNotice: {
      title: "Đã có phiên bản mới {{version}}",
      description: "Có bản cộng đồng mới hơn trên GitHub.",
      currentVersion: "Phiên bản hiện tại",
      latestVersion: "Phiên bản mới nhất",
      publishedAt: "Phát hành: {{date}}",
      changelogTitle: "Nội dung cập nhật",
      noChangelog: "Phiên bản này chưa có ghi chú phát hành chi tiết.",
      imageAlt: "Cập nhật LeafTab",
      badge: "Phiên bản mới v{{version}}",
      later: "Để sau",
      ignoreThisVersion: "Bỏ qua phiên bản này",
      downloadFromGithub: "Tải từ GitHub",
      openRelease: "Tải từ GitHub",
      sampleNote1: "Thống nhất tương tác cài đặt đồng bộ đám mây và WebDAV",
      sampleNote2: "Thêm hộp thoại thông báo cập nhật tự động, dẫn thẳng tới GitHub Release",
      sampleNote3: "Cải thiện bố cục hộp thoại nhật ký cập nhật"
    },
    languages: {
      zh: "简体中文",
      "zh-TW": "繁體中文",
      vi: "Tiếng Việt",
      en: "English",
      ja: "Tiếng Nhật",
      ko: "Tiếng Hàn"
    },
    weather: {
      refreshing: "Đang cập nhật thời tiết và vị trí...",
      unknown: "Không xác định",
      wallpaper: {
        colorPresets: {
          "aurora-blush": "Aurora Blush",
          "mist-lilac": "Mist Lilac",
          "mint-breeze": "Mint Breeze",
          "peach-cloud": "Peach Cloud",
          "glacier-milk": "Glacier Blue",
          "rose-water": "Rose Water",
          "sage-cream": "Sage Cream",
          "dawn-sand": "Dawn Sand",
          "lavender-snow": "Lavender Snow",
          "ocean-haze": "Ocean Haze",
          "camellia-silk": "Camellia Silk",
          "tea-ivory": "Tea Ivory"
        }
      },
      codes: {
        0: "Nắng",
        1: "Nắng",
        2: "Nhiều mây",
        3: "Âm u",
        45: "Sương mù",
        52: "Sương mù",
        51: "Mưa phùn nhẹ",
        53: "Mưa phùn vừa",
        54: "Mưa phùn nặng",
        55: "Mưa phùn nặng",
        56: "Mưa phùn băng giá",
        57: "Mưa phùn băng giá",
        58: "Mưa nhẹ",
        61: "Mưa nhẹ",
        63: "Mưa vừa",
        65: "Mưa to",
        66: "Mưa băng",
        67: "Mưa băng",
        71: "Tuyết nhẹ",
        73: "Tuyết vừa",
        75: "Tuyết rơi nhiều",
        77: "Hạt tuyết",
        80: "Mưa rào",
        81: "Mưa rào",
        82: "Mưa rào dữ dội",
        85: "Mưa tuyết",
        86: "Mưa tuyết",
        95: "Dông",
        96: "Dông có mưa đá",
        99: "Dông có mưa đá"
      },
      defaultCity: "Hàng Châu",
      defaultWeather: "Nhiều mây",
      unknownLocation: "Vị trí không xác định",
      local: "Địa phương"
    },
    lunar: {
      label: "Âm lịch"
    },
    common: {
      loading: "Đang tải...",
      cancel: "Hủy",
      confirm: "Xác nhận",
      delete: "Xóa",
      save: "Lưu",
      back: "Quay lại",
      more: "Thêm",
      clear: "Xóa"
    },
    user: {
      loggedIn: "Đã đăng nhập",
      logout: "Đăng xuất",
      loggedOut: "Đã đăng xuất"
    },
    search: {
      placeholder: "Gõ điều bạn muốn tìm",
      placeholderDynamic: "Gõ điều bạn muốn tìm, hoặc dán địa chỉ web",
      placeholderHintTabSwitch: "Muốn đổi cách tìm? Hãy nhấn Tab",
      placeholderHintCalculator: "Gõ 12*8 để tính nhanh",
      placeholderHintSiteDirect: "Gõ github react để tìm trên GitHub",
      placeholderHintPrefix: "Gõ !g AI để tìm bằng Google",
      enterKey: "Enter",
      actionOpen: "Mở",
      actionClose: "Đóng",
      actionSelect: "Chọn",
      systemEngine: "Mặc định hệ thống",
      useEngineSearch: "Tìm kiếm bằng {{engine}}",
      prefixEngineInlineHint: "Tìm bằng {{engine}}",
      historyTitle: "Lịch sử tìm kiếm",
      clearHistory: "Xóa",
      noHistory: "Không có lịch sử tìm kiếm"
    },
    groups: {
      edit: "Chỉnh sửa",
      addShortcut: "Lối tắt mới"
    },
    context: {
      open: "Mở",
      edit: "Sửa",
      copyLink: "Sao chép liên kết",
      delete: "Xóa",
      addShortcut: "Thêm lối tắt",
      newShortcut: "Lối tắt mới",
      pinToTop: "Ghim lên đầu",
      pinTop: "Ghim mục đã chọn lên đầu",
      pinBottom: "Ghim mục đã chọn xuống cuối",
      select: "Chọn",
      unselect: "Bỏ chọn",
      selectedCount: "Đã chọn {{count}}",
      deleteSelected: "Xóa mục đã chọn",
      moveToScenario: "Chuyển sang kịch bản",
      noScenarioTarget: "Không có kịch bản để chuyển đến",
      selectBeforeMove: "Hãy chọn lối tắt trước khi chuyển",
      multiSelect: "Chọn nhiều",
      cancelMultiSelect: "Thoát chọn nhiều"
    },
    sidebar: {
      toggle: "Bật/tắt thanh bên",
      title: "Thanh bên",
      description: "Hiển thị thanh bên trên di động."
    },
    shortcutModal: {
      addTitle: "Thêm lối tắt",
      editTitle: "Sửa lối tắt",
      nameLabel: "Tên",
      namePlaceholder: "Nhập tiêu đề lối tắt",
      urlLabel: "URL",
      urlPlaceholder: "Nhập URL",
      icon: {
        modeGroup: "Nguồn biểu tượng",
        modeOfficialShort: "Chính thức",
        modeFaviconShort: "Mạng",
        modeLetterShort: "Chữ",
        modeCustomShort: "Tùy chỉnh",
        modeCustomReplaceShort: "Thay đổi",
        modeCustomLoadingShort: "Đang xử lý",
        autoOfficial: "Tự động chuyển sang biểu tượng chính thức khi có",
        officialUnavailable: "Lối tắt này hiện chưa có biểu tượng chính thức",
        networkHint: "Biểu tượng mạng có thể tải thất bại; khi đó sẽ tự động chuyển sang biểu tượng chữ",
        customFileInvalid: "Hình ảnh này hiện chưa dùng được làm biểu tượng. Vui lòng thử ảnh khác."
      },
      errors: {
        fillAll: "Vui lòng điền đầy đủ thông tin",
        fillAllDesc: "Nhập tiêu đề và URL của lối tắt",
        duplicateUrl: "Đã có lối tắt cho trang web này",
        duplicateUrlDesc: "Mỗi trang web chỉ cho phép một lối tắt. Vui lòng kiểm tra lại URL."
      }
    },
    popupShortcut: {
      title: "Thêm trang hiện tại",
      loading: "Đang đọc thông tin tab hiện tại...",
      unsupported: "Trang hiện tại không phải liên kết website có thể lưu trực tiếp. Hãy đổi sang URL http hoặc https rồi lưu lại.",
      targetScenario: "Sẽ lưu vào chế độ “{{name}}”",
      ready: "Đã tự động điền tiêu đề và URL của tab hiện tại.",
      saved: "Đã lưu lối tắt",
      scenarioLabel: "Lưu vào chế độ",
      scenarioPlaceholder: "Chọn chế độ"
    },
    onboarding: {
      welcome: "Chào mừng đến với LeafTab",
      selectRole: "Chọn vai trò để bắt đầu trải nghiệm cá nhân hóa",
      skip: "Bỏ qua",
      start: "Bắt đầu",
      next: "Tiếp theo",
      layoutTip: "Bạn có thể đổi bố cục sau trong Cài đặt",
      stepAppearanceTitle: "Thiết lập giao diện và ngôn ngữ",
      stepAppearanceDesc: "Chọn giao diện và ngôn ngữ, có thể thay đổi sau trong Cài đặt",
      stepRoleTitle: "Chọn vai trò",
      stepRoleDesc: "Dùng để khởi tạo lối tắt và bố cục gợi ý",
      stepLayoutTitle: "Chọn kiểu bố cục",
      stepLayoutDesc: "Xác định cách sắp xếp trang chủ",
      stepPermissionsTitle: "Cấp quyền truy cập",
      stepPermissionsDesc: "Hoàn tất quyền lịch sử và dấu trang để có trải nghiệm tìm kiếm đầy đủ hơn",
      historyPermissionTitle: "Lịch sử duyệt web",
      historyPermissionDesc: "Cho phép LeafTab hiển thị lịch sử gần đây và gợi ý tìm kiếm liên quan",
      bookmarksPermissionTitle: "Dấu trang",
      bookmarksPermissionDesc: "Cho phép LeafTab tìm kiếm và mở trực tiếp nội dung dấu trang của trình duyệt",
      tabsPermissionTitle: "Tab trình duyệt",
      tabsPermissionDesc: "Cho phép LeafTab tìm kiếm tab đang mở và tránh mở trùng tab LeafTab",
      authorize: "Cấp quyền",
      authorizing: "Đang yêu cầu...",
      authorized: "Đã cấp quyền",
      unsupported: "Không hỗ trợ",
      permissionTip: "Bạn có thể bỏ qua bước này và cấp quyền sau trong quá trình sử dụng.",
      enterHome: "Vào LeafTab"
    },
    auth: {
      description: "Đăng nhập hoặc đăng ký để lưu cài đặt cá nhân của bạn.",
      tabs: { login: "Đăng nhập", register: "Đăng ký" },
      labels: { username: "Tên đăng nhập", password: "Mật khẩu", captcha: "Mã xác nhận" },
      placeholders: {
        usernameInput: "Nhập tên đăng nhập",
        passwordInput: "Nhập mật khẩu",
        usernameSet: "Đặt tên đăng nhập",
        passwordSet: "Đặt mật khẩu",
        captchaInput: "Nhập mã xác nhận"
      },
      tips: {
        username: "Hỗ trợ tiếng Anh, số, định dạng email; độ dài 2-32",
        password: "Độ dài mật khẩu phải từ 8-24 ký tự",
        refreshCaptcha: "Nhấp để làm mới"
      },
      buttons: {
        loggingIn: "Đang đăng nhập...",
        login: "Đăng nhập",
        registering: "Đang đăng ký...",
        register: "Đăng ký"
      },
      toast: {
        loginSuccess: "Đăng nhập thành công! Chào mừng trở lại, {{username}}",
        registerSuccess: "Đăng ký thành công! Vui lòng đăng nhập, {{username}}"
      },
      errors: {
        usernamePasswordRequired: "Vui lòng nhập tên đăng nhập và mật khẩu",
        captchaRequired: "Vui lòng nhập mã xác nhận",
        usernameFormatInvalid: "Định dạng tên đăng nhập không hợp lệ",
        passwordLength: "Mật khẩu phải từ 8-24 ký tự",
        loginFailed: "Đăng nhập thất bại",
        registerFailed: "Đăng ký thất bại",
        loginRequestFailed: "Yêu cầu đăng nhập thất bại. Kiểm tra mạng hoặc máy chủ.",
        registerRequestFailed: "Yêu cầu đăng ký thất bại. Kiểm tra mạng hoặc máy chủ.",
        userExists: "Tên người dùng đã tồn tại",
        userNotFound: "Người dùng không tồn tại",
        invalidPassword: "Mật khẩu sai",
        invalidCredentials: "Tên đăng nhập hoặc mật khẩu không đúng",
        invalidUsernameFormatBackend: "Định dạng tên đăng nhập không hợp lệ (3-20 ký tự chữ và số, dấu gạch dưới)",
        passwordTooShort: "Mật khẩu quá ngắn (ít nhất 6 ký tự)",
        credentialsRequired: "Vui lòng nhập tên đăng nhập và mật khẩu",
        invalidCaptcha: "Mã xác nhận không hợp lệ",
        internalError: "Lỗi máy chủ nội bộ"
      }
    },
    shortcutDelete: {
      title: "Xóa lối tắt",
      description: "Bạn có chắc chắn muốn xóa lối tắt này không?"
    },
    syncConflict: {
      title: "Xung đột đồng bộ",
      description: "Lối tắt cục bộ và đám mây khác nhau. Vui lòng chọn phiên bản để sử dụng.",
      useCloud: "Sử dụng đám mây",
      useLocal: "Sử dụng cục bộ"
    },
    scenario: {
      title: "Chế độ kịch bản",
      defaultName: "Working mode",
      createTitle: "Chế độ kịch bản mới",
      createDescription: "Đặt tên, màu sắc và biểu tượng",
      editTitle: "Sửa chế độ kịch bản",
      editDescription: "Sửa tên, màu sắc và biểu tượng",
      nameLabel: "Tên chế độ",
      namePlaceholder: "Nhập tên chế độ",
      colorLabel: "Màu sắc",
      iconLabel: "Biểu tượng",
      createButton: "Tạo chế độ mới",
      addButton: "Thêm",
      saveButton: "Lưu",
      deleteTitle: "Xóa chế độ kịch bản",
      deleteConfirm: "Bạn có chắc chắn muốn xóa chế độ kịch bản này không? Hành động này sẽ xóa tất cả các nhóm và lối tắt trong chế độ này và không thể hoàn tác.",
      deleteConfirmWithTarget: "Bạn có chắc chắn muốn xóa \"{{name}}\" không? Hành động này sẽ xóa tất cả các nhóm và lối tắt trong chế độ này và không thể hoàn tác.",
      deleteButton: "Xóa",
      toast: {
        created: "Đã tạo chế độ kịch bản",
        updated: "Đã cập nhật chế độ kịch bản",
        deleted: "Đã xóa chế độ kịch bản",
        switched: "Đã chuyển sang: {{name}}"
      }
    },
	    leaftabSyncCenter: {
      title: "Trung tâm đồng bộ",
      description: "Trung tâm đồng bộ dựa trên WebDAV, tập trung vào chế độ kịch bản, lối tắt và dấu trang.",
      bookmarkScope: "Phạm vi đồng bộ dấu trang: {{scope}}",
      summary: "{{shortcuts}} lối tắt, {{scenarios}} chế độ, {{bookmarks}} dấu trang",
      stateLabel: "Trạng thái",
      nav: {
        syncing: "Đang đồng bộ",
        attention: "Cần chú ý"
      },
      status: {
        syncing: "Đang đồng bộ",
        conflict: "Cần xử lý",
        error: "Thất bại",
        ready: "Sẵn sàng"
      },
      state: {
        analyzing: "Đang phân tích trạng thái đồng bộ...",
        syncing: "Đang đồng bộ nền",
        syncingDescription: "LeafTab đang so sánh dữ liệu cục bộ và từ xa, rồi ghi lại các thay đổi cần thiết. Vui lòng đợi hoàn tất.",
        initRequired: "Cần khởi tạo",
        initDescription: "Cả cục bộ và từ xa đều đã có dữ liệu. Hãy chọn cách khởi tạo lần đầu trước khi bật đồng bộ nền.",
        ready: "Sẵn sàng đồng bộ hợp nhất",
        readyDescription: "Công cụ đồng bộ mới có thể đẩy, kéo và hợp nhất chế độ, lối tắt và gốc dấu trang của trình duyệt."
      },
	      actions: {
	        syncing: "Đang đồng bộ..."
	      }
	    },
	    leaftabSync: {
	      provider: {
	        webdav: "Đồng bộ WebDAV",
	        cloud: "Đồng bộ đám mây",
	        generic: "Đồng bộ"
	      },
	      webdav: {
	        actions: {
	          mkcol: "Tạo thư mục",
	          upload: "Ghi",
	          download: "Đọc",
	          delete: "Xóa"
	        },
	        error: {
	          withPath: "WebDAV {{action}} thất bại ({{status}}): {{path}}",
	          noPath: "WebDAV {{action}} thất bại ({{status}})"
	        }
	      },
	      cloud: {
	        error: {
	          lockedTryFix: "Đồng bộ đám mây bị thiết bị khác khóa. Đã thử tự sửa; nếu vẫn lỗi hãy thử lại.",
	          remoteCommitChanged: "Dữ liệu đám mây vừa thay đổi. Vui lòng đồng bộ lại.",
	          parentCommitRequired: "Có phiên bản mới hơn trên đám mây. Hãy kéo dữ liệu mới nhất trước khi ghi đè.",
	          httpStatus: "Đồng bộ đám mây thất bại ({{status}})",
	          generic: "Đồng bộ đám mây thất bại"
	        }
	      }
	    },
	    leaftabSyncRunner: {
	      progressDetailDefault: "Đang đồng bộ nền. Bạn có thể tiếp tục sử dụng LeafTab.",
	      permissionTitle: "Đang kiểm tra quyền dấu trang",
	      permissionDetail: "LeafTab cần quyền truy cập dữ liệu dấu trang.",
	      bookmarksPermissionDeniedToast: "Chưa cấp quyền dấu trang. Lần này chỉ đồng bộ lối tắt và cài đặt.",
	      bookmarksPermissionDeniedToastAlt: "Chưa cấp quyền dấu trang. Chỉ đồng bộ lối tắt và cài đặt.",
	      successTitle: "Đồng bộ hoàn tất",
	      successToastFallback: "Đồng bộ hoàn tất",
	      successDetailFallback: "Dữ liệu cục bộ và từ xa đã được xử lý.",
	      webdav: {
	        prepareTitle: "Đang chuẩn bị đồng bộ",
	        prepareDetail: "Đang đọc trạng thái cục bộ và WebDAV",
	        disable: {
	          title: "Đang tắt đồng bộ",
	          detail: "Đang chạy đồng bộ lần cuối và tắt đồng bộ",
	          finalSyncTitle: "Đang đồng bộ thay đổi cuối cùng",
	          closingTitle: "Đang tắt đồng bộ",
	          clearingTitle: "Đang xóa dữ liệu cục bộ",
	          doneTitle: "Đã tắt đồng bộ"
	        }
	      },
	      cloud: {
	        prepareTitle: "Đang chuẩn bị đồng bộ đám mây",
	        prepareDetail: "Đang đọc trạng thái cục bộ và tài khoản đám mây",
	        lockConflict: {
	          autoFixToast: "Phát hiện xung đột khóa đồng bộ đám mây (409). Đang tự sửa và thử lại...",
	          autoFixTitle: "Phát hiện khóa đám mây cũ, đang tự sửa",
	          autoFixDetail: "Đang giải phóng khóa cũ và thử đồng bộ lại",
	          failedToast: "Đồng bộ đám mây thất bại (409): Khóa đồng bộ đang bị thiết bị khác giữ. Hãy tắt đồng bộ trên thiết bị khác và thử lại, hoặc đợi khoảng 2 phút."
	        },
	        commitConflict: {
	          realignTitle: "Phát hiện thay đổi phiên bản đám mây, đang căn chỉnh lại trạng thái",
	          realignDetail: "Đang chờ trạng thái mới nhất có hiệu lực trước khi thử lại"
	        }
	      }
	    },
	    leaftabSyncActions: {
	      dataDetail: {
	        withBookmarks: "Đang xử lý lối tắt và dấu trang",
	        shortcutsOnly: "Đang xử lý lối tắt"
	      },
	      bookmarksPermissionRequired: "Chưa cấp quyền dấu trang, không thể sửa đồng bộ.",
	      webdav: {
	        inProgress: "Đồng bộ WebDAV đang chạy. Vui lòng đợi.",
	        syncingTitle: "Đang đồng bộ tới WebDAV",
	        repair: {
	          pullTitle: "Đang ghi đè dữ liệu cục bộ bằng WebDAV",
	          pushTitle: "Đang ghi đè WebDAV bằng dữ liệu cục bộ",
	          pullSuccess: "Đã ghi đè dữ liệu cục bộ bằng dữ liệu WebDAV",
	          pushSuccess: "Đã ghi đè WebDAV bằng dữ liệu cục bộ",
	          pullFailed: "Không thể ghi đè dữ liệu cục bộ bằng WebDAV",
	          pushFailed: "Không thể ghi đè WebDAV bằng dữ liệu cục bộ"
	        }
	      },
	      cloud: {
	        inProgress: "Đồng bộ đám mây đang chạy. Vui lòng đợi.",
	        syncingTitle: "Đang đồng bộ tới đám mây",
	        repair: {
	          pullTitle: "Đang ghi đè dữ liệu cục bộ bằng dữ liệu đám mây",
	          pushTitle: "Đang ghi đè đám mây bằng dữ liệu cục bộ",
	          pullSuccess: "Đã ghi đè dữ liệu cục bộ bằng dữ liệu đám mây",
	          pushSuccess: "Đã ghi đè đám mây bằng dữ liệu cục bộ"
	        }
	      }
	    },
	    syncPreview: {
	      hint: {
	        local: "Các mục gạch ngang bên phải sẽ bị xóa khỏi đám mây sau khi đồng bộ.",
	        cloud: "Các mục gạch ngang bên trái sẽ bị xóa khỏi cục bộ sau khi đồng bộ.",
	        merge: "Hợp nhất giữ cả hai bên và loại trùng (ưu tiên cục bộ)."
	      },
	      noComparable: "Không tìm thấy dữ liệu lối tắt có thể so sánh."
	    },
	    leaftabDangerousSync: {
	      title: "Đã chặn đồng bộ rủi ro",
	      description: "Phát hiện số lượng dấu trang thay đổi bất thường nên đã tạm dừng tự động đồng bộ.",
	      riskDescription: "Số dấu trang dự kiến sẽ đổi từ {{from}} xuống {{to}}, có thể xóa nhầm khoảng {{loss}} mục.",
	      localBookmarks: "Dấu trang cục bộ",
	      remoteBookmarks: "Dấu trang {{provider}}",
	      continueWithoutBookmarks: "Tiếp tục đồng bộ lối tắt và cài đặt",
	      continueWithoutBookmarksHint: "Lần này sẽ không thay đổi dấu trang; chỉ đồng bộ lối tắt và cài đặt.",
	      deferBookmarks: "Xử lý dấu trang sau",
	      advancedActions: "Nâng cao",
	      useRemotePlain: "Giữ dấu trang {{provider}} (cục bộ sẽ bị ghi đè)",
	      useLocalPlain: "Giữ dấu trang cục bộ ({{provider}} sẽ bị ghi đè)",
	      toast: {
	        skipBookmarks: "Lần này sẽ bỏ qua dấu trang và chỉ đồng bộ lối tắt và cài đặt.",
	        cloudBookmarksDisabled: "Đã bật đồng bộ đám mây và tạm thời tắt “Đồng bộ dấu trang”.",
	        webdavBookmarksDisabled: "Đã bật đồng bộ WebDAV và tạm thời tắt “Đồng bộ dấu trang”."
	      }
	    },
	    leaftabSyncDialog: {
      description: "Quản lý trạng thái đồng bộ LeafTab, đồng bộ thủ công và cấu hình WebDAV tại đây.",
      scopeDefault: "Dấu trang",
      lastSyncEmpty: "Chưa có",
      lastSyncUnavailable: "Chưa đồng bộ",
      manualSyncOnly: "Hiện chỉ đồng bộ thủ công",
      autoSyncOn: "Đã bật đồng bộ tự động",
      enableSync: "Bật đồng bộ",
      repair: "Sửa đồng bộ",
      cloudOverwriteLocal: "Đám mây ghi đè cục bộ",
      localOverwriteCloud: "Cục bộ ghi đè đám mây",
      remoteOverwriteLocal: "WebDAV ghi đè cục bộ",
      localOverwriteRemote: "Cục bộ ghi đè WebDAV",
      tabs: {
        cloud: "Đám mây",
        webdav: "WebDAV"
      },
      metrics: {
        localShortcuts: "Lối tắt cục bộ",
        localBookmarks: "Dấu trang cục bộ",
        remoteShortcuts: "Lối tắt đám mây",
        remoteBookmarks: "Dấu trang đám mây"
      },
      details: {
        lastSync: "Lần đồng bộ gần nhất",
        nextSync: "Lần đồng bộ tiếp theo",
        scope: "Phạm vi"
      },
      cloud: {
        bookmarkSyncDisabledBanner: "Chưa bật đồng bộ dấu trang. Hiện chỉ đồng bộ lối tắt và cài đặt.",
        enableBookmarkSyncAction: "Bật",
        connectedFallback: "Tài khoản LeafTab",
        unsignedTitle: "Chưa đăng nhập",
        unsignedSubtitle: "Đăng nhập để đồng bộ dữ liệu",
        loginToStart: "Đăng nhập để cấu hình",
        signedOut: "Chưa đăng nhập",
        connectedSubtitle: "Đã đăng nhập, có thể đồng bộ dữ liệu LeafTab",
        disabledSubtitle: "Đã đăng nhập, có thể bật đồng bộ trong cài đặt đám mây",
        openSettingsToEnable: "Đi bật",
        ready: "Đã kết nối",
        disabled: "Chưa bật",
        error: "Thất bại",
        enableViaSettings: "Bật đồng bộ",
        manage: "Quản lý đồng bộ đám mây",
        scopeRich: "Lối tắt, {{scope}}",
        scopeShortcutsOnly: "Chỉ lối tắt và cài đặt"
      },
      webdav: {
        connectedFallback: "WebDAV",
        unconfiguredTitle: "WebDAV chưa bật",
        unconfiguredSubtitle: "Chưa cấu hình, hãy cấu hình trước",
        enabledSubtitle: "Đã cấu hình, có thể đồng bộ lên WebDAV",
        disabledSubtitle: "Đã cấu hình, chưa bật đồng bộ",
        configureToStart: "Cấu hình để bắt đầu",
        enableToStart: "Đã cấu hình, cần bật",
        scopeWithLabel: "Lối tắt, {{scope}}"
      }
    },
	    leaftabSyncEncryption: {
      cloudNotEnabledTitle: "Chưa bật đồng bộ đám mây",
      cloudNotEnabledPill: "Chưa bật",
      webdavNotEnabledTitle: "Chưa bật đồng bộ WebDAV",
      webdavNotEnabledPill: "Chưa bật",
      statusReadyTitle: "Đã bật mã hóa đầu-cuối",
      statusMissingTitle: "Chưa thiết lập mật khẩu đồng bộ",
      statusReadyPill: "Đã bảo vệ",
      statusMissingPill: "Chưa đặt",
      setupTitle: "Thiết lập mật khẩu đồng bộ",
      unlockTitle: "Nhập mật khẩu đồng bộ",
      setupDescription: "Thiết lập mật khẩu mã hóa đầu-cuối cho {{provider}}. Máy chủ không thể đọc dữ liệu đồng bộ và cũng không thể khôi phục mật khẩu này.",
      unlockDescription: "Nhập mật khẩu đồng bộ của {{provider}} để giải mã dữ liệu đã được mã hóa trên đám mây.",
      setupConfirm: "Lưu",
      unlockConfirm: "Mở khóa đồng bộ",
      e2eeSetupDescription: "Dữ liệu được mã hóa trên máy trước khi tải lên đám mây hoặc WebDAV. Chỉ các thiết bị có mật khẩu này mới có thể giải mã.",
      e2eeUnlockDescription: "Dữ liệu đồng bộ được lưu ở dạng mã hóa trên đám mây. Nhập đúng mật khẩu để giải mã trên thiết bị này.",
      passphraseLabel: "Mật khẩu đồng bộ",
      passphrasePlaceholder: "Ít nhất 8 ký tự; nên có chữ và số",
      passphraseHint: "Đây là mật khẩu dùng cho đồng bộ, không phải mật khẩu đăng nhập tài khoản.",
      confirmLabel: "Nhập lại mật khẩu",
      confirmPlaceholder: "Nhập lại để xác nhận",
      setupChecklistTitle: "Hãy xác nhận trước khi tiếp tục",
      checklist: {
        serverCannotAccess: "Chúng tôi không lưu mật khẩu này và không thể xem dữ liệu đồng bộ đã mã hóa của bạn.",
        cannotRecover: "Nếu quên mật khẩu này, dữ liệu đồng bộ đã mã hóa hiện có sẽ không thể khôi phục.",
        newDeviceUnlock: "Khi đổi thiết bị hoặc xóa dữ liệu cục bộ, bạn sẽ cần nhập lại mật khẩu này."
      },
	      deviceUnlockDescription: "Sau khi thiết bị này được mở khóa, các lần đồng bộ sau không cần nhập lại.",
	      errors: {
	        missingMetadata: "Thiếu metadata mã hóa đồng bộ",
	        incorrectPassphrase: "Mật khẩu đồng bộ không đúng",
	        invalidConfig: "Cấu hình mã hóa đồng bộ không hợp lệ"
	      },
	      toast: {
	        saved: "Đã lưu mật khẩu đồng bộ",
	        unlocked: "Đã mở khóa dữ liệu đồng bộ",
	        saveFailed: "Lưu mật khẩu đồng bộ thất bại"
	      }
	    },
	    leaftabFirstSync: {
      title: "Khởi tạo đồng bộ",
      description: "Chọn cách lần đồng bộ LeafTab đầu tiên xử lý dấu trang trình duyệt, dữ liệu LeafTab cục bộ và dữ liệu từ xa.",
      recommended: "Khuyến nghị",
      processingBadge: "Đang xử lý",
      processingInline: "Đang khởi tạo đồng bộ trong nền, vui lòng chờ...",
      processingFooter: "Đang khởi tạo đồng bộ trong nền. Vui lòng không đóng cửa sổ này. Hoàn tất sẽ tự quay về trạng thái đồng bộ bình thường.",
      footer: "Bước này chỉ xuất hiện trong lần đồng bộ đầu tiên. Sau khi khởi tạo, LeafTab sẽ dùng chế độ đồng bộ mới dựa trên hợp nhất.",
      bookmarkScopeDescription: "Dấu trang được đồng bộ trực tiếp theo thư mục gốc thật của trình duyệt, không tạo thêm bản sao. Phạm vi hiện tại: {{scope}}.",
      choice: {
        push: {
          title: "Tải lên dữ liệu cục bộ",
          description: "Dùng thiết bị này làm chuẩn và tải dữ liệu LeafTab cùng dấu trang hiện tại lên WebDAV."
        },
        pull: {
          title: "Tải xuống dữ liệu từ xa",
          description: "Ghi đè dữ liệu LeafTab và dấu trang cục bộ bằng bản snapshot từ xa mới nhất trên WebDAV."
        },
        merge: {
          title: "Hợp nhất thông minh",
          description: "Hợp nhất dữ liệu cục bộ và từ xa, giữ lại nội dung chỉ có ở mỗi bên và tự xử lý hầu hết xung đột."
        }
      }
    },
    toast: {
      cloudSynced: "Đã đồng bộ cấu hình đám mây",
      cloudAutoSyncSuccess: "Đã hoàn tất đồng bộ tự động lên đám mây",
      cloudSyncFailed: "Đồng bộ cấu hình đám mây thất bại",
      syncFailed: "Đồng bộ thất bại",
      syncCloudApplied: "Đã áp dụng cấu hình đám mây",
      syncLocalApplied: "Đã áp dụng cấu hình cục bộ",
      linkCopied: "Đã sao chép liên kết",
      linkCopyFailed: "Sao chép liên kết thất bại",
      loadedFromCache: "Đã tải từ bộ nhớ tạm (Chế độ ngoại tuyến)",
      sessionExpired: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"
    }
  }
};
