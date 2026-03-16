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
            description: "Dùng tiền tố g / bing / ddg / bd để đổi công cụ tạm thời",
            tooltip: "Ví dụ: `g AI` sẽ tìm bằng Google cho truy vấn đó mà không đổi công cụ mặc định."
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
        rhythmDesc: "Chỉ giữ tìm kiếm và lối tắt",
        panoramic: "Toàn cảnh",
        panoramicDesc: "Hiển thị thời gian, thời tiết, hình nền và lối tắt"
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
        webdav: {
          entry: "Đồng bộ WebDAV",
          entryDesc: "Cấu hình sao lưu & khôi phục từ xa qua WebDAV",
          configure: "Cấu hình",
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
        release130DynamicEffectsOptimize: "Tối ưu trải nghiệm hiệu ứng động toàn cục với công tắc Giảm hiệu ứng động và cơ chế giảm chuyển động thống nhất",
        release130DynamicWallpaperTab: "Thêm tab hình nền Động mới, hỗ trợ xem trước và áp dụng Prism, Silk, Light Rays, Beams, Galaxy, Iridescence",
        release130ManualWeatherCity: "Tính năng thời tiết nay hỗ trợ chọn thủ công thành phố và lưu lại để hiển thị vị trí ổn định hơn",
        release129ModeUiRefactor: "Tái cấu trúc UI cho 3 chế độ Toàn cảnh / Nhịp điệu / Khoảng trắng, tách component dùng chung và dọn mã trùng lặp cũ",
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
      later: "Để sau",
      ignoreThisVersion: "Bỏ qua phiên bản này",
      downloadFromGithub: "Tải từ GitHub"
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
      placeholder: "Tìm kiếm nội dung...",
      placeholderDynamic: "Tìm kiếm nội dung hoặc nhập URL...",
      placeholderHintTabSwitch: "Nhấn Tab để đổi công cụ tìm kiếm",
      placeholderHintCalculator: "Nhập biểu thức để tính nhanh",
      placeholderHintSiteDirect: "Tìm theo site: ví dụ github react",
      placeholderHintPrefix: "Tìm bằng prefix: ví dụ g AI",
      systemEngine: "Mặc định hệ thống",
      useEngineSearch: "Tìm kiếm bằng {{engine}}",
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
      pinToTop: "Ghim lên đầu"
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
      errors: {
        fillAll: "Vui lòng điền đầy đủ thông tin",
        fillAllDesc: "Nhập tiêu đề và URL của lối tắt",
        duplicateUrl: "Đã có lối tắt cho trang web này",
        duplicateUrlDesc: "Mỗi trang web chỉ cho phép một lối tắt. Vui lòng kiểm tra lại URL."
      }
    },
    onboarding: {
      welcome: "Chào mừng đến với LeafTab",
      selectRole: "Chọn vai trò để bắt đầu trải nghiệm cá nhân hóa",
      skip: "Bỏ qua",
      start: "Bắt đầu",
      stepAppearanceTitle: "Thiết lập giao diện và ngôn ngữ",
      stepAppearanceDesc: "Chọn giao diện và ngôn ngữ, có thể thay đổi sau trong Cài đặt",
      stepRoleTitle: "Chọn vai trò",
      stepRoleDesc: "Dùng để khởi tạo lối tắt và bố cục gợi ý",
      stepLayoutTitle: "Chọn kiểu bố cục",
      stepLayoutDesc: "Xác định cách sắp xếp trang chủ",
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
        deleted: "Đã xóa chế độ kịch bản"
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
