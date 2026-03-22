# Chrome Web Store Review Notes (WebDAV Permissions)

Use this as reviewer notes when submitting the extension.

## Why permission is needed
- `permissions`: `permissions`
- `optional_host_permissions`: `https://*/*`, `http://*/*`
- Purpose: let users sync backup data to their own WebDAV server.

## How permission is used
- The extension requests host permission only for the exact WebDAV origin the user configures.
- Permission request happens only when the user triggers WebDAV sync-related actions.
- Granted permission is used only for WebDAV backup `GET`/`PUT` requests.

## What is not done
- No scanning of arbitrary websites.
- No crawling or content extraction from unrelated pages.
- No upload of local device files outside user backup payload.

## User-facing disclosure
- WebDAV settings UI shows a notice about permission scope and purpose.
- README privacy section explains on-demand WebDAV host permission behavior.
