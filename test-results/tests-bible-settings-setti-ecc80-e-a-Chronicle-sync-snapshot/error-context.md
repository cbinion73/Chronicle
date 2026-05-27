# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/bible-settings.spec.js >> settings data and privacy can create a Chronicle sync snapshot
- Location: tests/bible-settings.spec.js:180:1

# Error details

```
Error: apiRequestContext.get: read ECONNRESET
Call log:
  - → GET http://127.0.0.1:5175/api/chronicle-sync/status
    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img "Chronicle" [ref=e6]
      - generic [ref=e7]:
        - heading "CHRONICLE" [level=1] [ref=e8]
        - paragraph [ref=e9]: Spiritual Formation
    - navigation "Primary" [ref=e10]:
      - button "Today" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: Today
      - button "Bible" [ref=e17] [cursor=pointer]:
        - img [ref=e18]
        - text: Bible
      - button "Study" [ref=e21] [cursor=pointer]:
        - img [ref=e22]
        - text: Study
      - button "Discipleship" [ref=e25] [cursor=pointer]:
        - img [ref=e26]
        - text: Discipleship
      - button "Prayer" [ref=e29] [cursor=pointer]:
        - img [ref=e30]
        - text: Prayer
      - button "Chronicle" [ref=e32] [cursor=pointer]:
        - img [ref=e33]
        - text: Chronicle
      - button "Themes" [ref=e36] [cursor=pointer]:
        - img [ref=e37]
        - text: Themes
      - button "Plans" [ref=e40] [cursor=pointer]:
        - img [ref=e41]
        - text: Plans
      - button "Legacy" [ref=e43] [cursor=pointer]:
        - img [ref=e44]
        - text: Legacy
      - button "Insights" [ref=e48] [cursor=pointer]:
        - img [ref=e49]
        - text: Insights
      - button "Settings" [ref=e52] [cursor=pointer]:
        - img [ref=e53]
        - text: Settings
    - generic [ref=e56]:
      - generic [ref=e57]: Current Plan
      - generic [ref=e58]: Daily Walk
      - generic [ref=e59]: Day 23 of 365
      - generic [ref=e62]: Streak
      - generic [ref=e63]:
        - generic [ref=e64]: 🔥
        - generic [ref=e65]:
          - generic [ref=e66]: 12 days
          - generic [ref=e67]: Keep showing up.
  - generic [ref=e68]:
    - banner [ref=e69]:
      - button "Search Scripture, themes, notes... ⌘K" [ref=e70] [cursor=pointer]:
        - img [ref=e71]
        - generic [ref=e74]: Search Scripture, themes, notes...
        - generic [ref=e75]: ⌘K
      - generic [ref=e76]:
        - button "New Chronicle entry (⌘N)" [ref=e77] [cursor=pointer]:
          - img [ref=e78]
        - button "Notifications" [ref=e79] [cursor=pointer]:
          - img [ref=e80]
        - button "Dark mode" [ref=e82] [cursor=pointer]:
          - img [ref=e83]
        - generic [ref=e85] [cursor=pointer]: C
    - generic [ref=e86]:
      - generic [ref=e88]:
        - navigation "Settings sections" [ref=e89]:
          - button "👤 Profile" [ref=e90] [cursor=pointer]:
            - generic [ref=e91]: 👤
            - text: Profile
          - button "📖 Scripture" [ref=e92] [cursor=pointer]:
            - generic [ref=e93]: 📖
            - text: Scripture
          - button "💬 AI Companion" [ref=e94] [cursor=pointer]:
            - generic [ref=e95]: 💬
            - text: AI Companion
          - button "📓 Chronicle" [ref=e96] [cursor=pointer]:
            - generic [ref=e97]: 📓
            - text: Chronicle
          - button "📈 Formation" [ref=e98] [cursor=pointer]:
            - generic [ref=e99]: 📈
            - text: Formation
          - button "🎨 Appearance" [ref=e100] [cursor=pointer]:
            - generic [ref=e101]: 🎨
            - text: Appearance
          - button "🔔 Notifications" [ref=e102] [cursor=pointer]:
            - generic [ref=e103]: 🔔
            - text: Notifications
          - button "🔒 Data & Privacy" [ref=e104] [cursor=pointer]:
            - generic [ref=e105]: 🔒
            - text: Data & Privacy
          - button "ℹ️ About" [ref=e106] [cursor=pointer]:
            - generic [ref=e107]: ℹ️
            - text: About
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e111]: Data & Privacy
            - generic [ref=e112]: Changes saved automatically
          - generic [ref=e114]:
            - generic [ref=e115]:
              - generic [ref=e117]: Storage
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]: Chronicle Library
                  - generic [ref=e121]: Local-first study state, notes, and imported book metadata live in Chronicle's private workspace
                - generic [ref=e123]: 5 entries
              - generic [ref=e124]:
                - generic [ref=e125]:
                  - generic [ref=e126]: Scripture Library
                  - generic [ref=e127]: Installed local Bible translations for offline reading across devices later
                - generic [ref=e128]: NKJV
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]: Data Health Center
                - generic [ref=e132]: See the main operational queues Chronicle is watching and run the next repair step from one place.
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]:
                    - generic [ref=e136]: "1"
                    - generic [ref=e137]: Cache gaps
                  - generic [ref=e138]:
                    - generic [ref=e139]: "0"
                    - generic [ref=e140]: OCR repair queue
                  - generic [ref=e141]:
                    - generic [ref=e142]: "0"
                    - generic [ref=e143]: Workbook flags
                  - generic [ref=e144]:
                    - generic [ref=e145]: "0"
                    - generic [ref=e146]: Low source-health books
                - generic [ref=e147]:
                  - button "Build ASV Cache" [ref=e148] [cursor=pointer]
                  - button "OCR Health is Stable" [disabled] [ref=e149]
                  - button "Workbook QA is Clear" [disabled] [ref=e150]
                  - button "Refresh Data Health" [ref=e151] [cursor=pointer]
                - generic [ref=e152]: Chronicle is watching Bible cache coverage, OCR confidence, workbook overlay coverage, and snapshot availability so repair work can start from here instead of from scattered tabs.
            - generic [ref=e153]:
              - generic [ref=e155]: Backup & Sync
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - generic [ref=e158]: Private Sync
                  - generic [ref=e159]: Prepared for local-first sync across desktop, iPad, and iPhone
                - switch [checked] [ref=e161] [cursor=pointer]
              - generic [ref=e163]:
                - generic [ref=e164]:
                  - generic [ref=e165]: Device Label
                  - generic [ref=e166]: This name travels with exported snapshots so other devices know where they came from.
                - textbox [ref=e168]: Chronicle Desktop
              - generic [ref=e169]:
                - generic [ref=e170]:
                  - generic [ref=e171]: Cache Policy
                  - generic [ref=e172]: Tell Chronicle what each device should keep fully local versus fetch on demand.
                - generic [ref=e174]:
                  - combobox [ref=e175] [cursor=pointer]:
                    - option "eager" [selected]
                    - option "on-demand"
                  - combobox [ref=e176] [cursor=pointer]:
                    - option "eager" [selected]
                    - option "on-demand"
                  - combobox [ref=e177] [cursor=pointer]:
                    - option "selected-books" [selected]
                    - option "on-demand"
              - generic [ref=e178]:
                - generic [ref=e180]: Last Backup
                - generic [ref=e181]: 5/7/2026, 11:23:14 PM
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - generic [ref=e184]:
                    - generic [ref=e185]: Chronicle Sync Snapshot
                    - generic [ref=e186]: Package your current Chronicle state, imported-book catalog, and Bible-library metadata into a portable local snapshot.
                  - generic [ref=e187]:
                    - button "Refresh Sync Status" [ref=e188] [cursor=pointer]
                    - button "Import & Merge Snapshot File" [ref=e189] [cursor=pointer]
                    - button "Merge Latest Snapshot" [ref=e190] [cursor=pointer]
                    - button "Restore Latest Snapshot" [ref=e191] [cursor=pointer]
                    - button "Download Latest Snapshot" [ref=e192] [cursor=pointer]
                    - button "Create Chronicle Snapshot" [ref=e193] [cursor=pointer]
                - generic [ref=e194]:
                  - generic [ref=e195]:
                    - generic [ref=e196]: "173"
                    - generic [ref=e197]: Snapshots
                  - generic [ref=e198]:
                    - generic [ref=e199]: "0"
                    - generic [ref=e200]: Structured Books
                  - generic [ref=e201]:
                    - generic [ref=e202]: "0"
                    - generic [ref=e203]: Uploaded Books
                  - generic [ref=e204]:
                    - generic [ref=e205]: "8325"
                    - generic [ref=e206]: Theme Cache Files
                - generic [ref=e207]:
                  - generic [ref=e208]: Start Over Without Losing Your Books
                  - generic [ref=e209]: This clears Chronicle entries, prayer history, streak and daily-walk progress, bookmarks, and workbook answers. Your imported books, OCR assets, Bible library, and snapshots stay intact.
                  - button "Reset Personal Progress (Keep Books)" [ref=e211] [cursor=pointer]
                - generic [ref=e212]:
                  - generic [ref=e213]: Latest snapshot
                  - generic [ref=e214]: snapshot-2026-05-08T03-23-14-386Z
                  - generic [ref=e215]: 5/7/2026, 11:23:14 PM · 13 KB · Chronicle Desktop
                  - generic [ref=e216]: Snapshot schema v3 · app state v9
                  - generic [ref=e217]: "Portable merge policy: field-aware local-first · sync model v1"
                  - generic [ref=e218]: "Cache posture: 5 translations · 0 imported PDFs · 0 OCR texts"
                  - generic [ref=e219]: /Users/chris/Desktop/CODE/chronicle/data/sync-snapshots/snapshot-2026-05-08T03-23-14-386Z.json
                - generic [ref=e220]:
                  - generic [ref=e222]:
                    - generic [ref=e223]:
                      - generic [ref=e224]: 5/7/2026, 11:23:14 PM
                      - generic [ref=e225]: 5 entries · 6 prayers · 1 books · 0 bookmarks
                      - generic [ref=e226]: Snapshot schema v3 · app state v9
                    - button "Merge" [ref=e227] [cursor=pointer]
                    - button "Restore" [ref=e228] [cursor=pointer]
                    - button "Download" [ref=e229] [cursor=pointer]
                  - generic [ref=e231]:
                    - generic [ref=e232]:
                      - generic [ref=e233]: 5/7/2026, 11:21:49 PM
                      - generic [ref=e234]: 5 entries · 6 prayers · 1 books · 0 bookmarks
                      - generic [ref=e235]: Snapshot schema v3 · app state v9
                    - button "Merge" [ref=e236] [cursor=pointer]
                    - button "Restore" [ref=e237] [cursor=pointer]
                    - button "Download" [ref=e238] [cursor=pointer]
                  - generic [ref=e240]:
                    - generic [ref=e241]:
                      - generic [ref=e242]: 5/7/2026, 11:17:54 PM
                      - generic [ref=e243]: 5 entries · 6 prayers · 1 books · 0 bookmarks
                      - generic [ref=e244]: Snapshot schema v3 · app state v9
                    - button "Merge" [ref=e245] [cursor=pointer]
                    - button "Restore" [ref=e246] [cursor=pointer]
                    - button "Download" [ref=e247] [cursor=pointer]
                  - generic [ref=e249]:
                    - generic [ref=e250]:
                      - generic [ref=e251]: 5/7/2026, 11:15:38 PM
                      - generic [ref=e252]: 5 entries · 6 prayers · 1 books · 0 bookmarks
                      - generic [ref=e253]: Snapshot schema v3 · app state v9
                    - button "Merge" [ref=e254] [cursor=pointer]
                    - button "Restore" [ref=e255] [cursor=pointer]
                    - button "Download" [ref=e256] [cursor=pointer]
            - generic [ref=e257]:
              - generic [ref=e258]:
                - generic [ref=e259]: Study Imports
                - generic [ref=e260]: OCR scanned study books and import structured source material for Chronicle study and discipleship workflows
              - generic [ref=e261]:
                - generic [ref=e262]:
                  - generic [ref=e263]: OCR Tooling
                  - generic [ref=e264]: Installed locally for scanned PDF extraction
                - generic [ref=e266]:
                  - generic [ref=e267]: tesseract
                  - generic [ref=e268]: ocrmypdf
                  - generic [ref=e269]: pdftotext
              - generic [ref=e270]:
                - generic [ref=e271]:
                  - generic [ref=e272]: Rebuild Text Layer
                  - generic [ref=e273]: Use fresh OCR instead of trusting an existing PDF text layer
                - switch [checked] [ref=e275] [cursor=pointer]
              - generic [ref=e277]:
                - generic [ref=e278]:
                  - generic [ref=e279]: Choose a PDF from your computer
                  - generic [ref=e280]: Chronicle will copy the file into its own local library and use that stored copy for OCR and study imports.
                  - button "Choose File" [ref=e282]
                - generic [ref=e283]:
                  - generic [ref=e284]: Scanned PDF Path
                  - textbox [ref=e285]: /Users/chris/Downloads/Masterlife All Sessions Complete.pdf
                - generic [ref=e286]:
                  - generic [ref=e287]:
                    - generic [ref=e288]: Output stem
                    - textbox [ref=e289]: masterlife-book1
                  - generic [ref=e290]:
                    - generic [ref=e291]: Page range
                    - textbox "1-10" [ref=e292]
                - generic [ref=e293]:
                  - generic [ref=e294]:
                    - generic [ref=e295]: Segment size
                    - textbox "20" [ref=e296]
                  - generic [ref=e297]: For a whole-book pass, leave page range blank and use segmented OCR. Chronicle will OCR the entire book from start to finish in ordered chunks.
                - generic [ref=e298]:
                  - generic [ref=e299]: Chronicle can recommend the chunk size based on book length and whether you want to preserve existing daily sessions or reshape the book into daily study.
                  - button "Recommend Chunking" [ref=e300] [cursor=pointer]
                - generic [ref=e301]:
                  - generic [ref=e302]: Use a page range for faster passes while cleaning up a purchased book.
                  - generic [ref=e303]:
                    - button "Run OCR" [ref=e304] [cursor=pointer]
                    - button "Run Whole Book in Segments" [ref=e305] [cursor=pointer]
              - generic [ref=e306]:
                - generic [ref=e307]:
                  - generic [ref=e308]: MasterLife Text Import
                  - textbox [ref=e309]: /Users/chris/Desktop/CODE/chronicle/data/ocr/books/masterlife-book1/masterlife-book1.book.txt
                - generic [ref=e310]:
                  - generic [ref=e311]: Imports OCR text into Chronicle's structured MasterLife source data and makes it available on the Study page.
                  - button "Import & Apply MasterLife" [ref=e312] [cursor=pointer]
              - generic [ref=e313]:
                - generic [ref=e314]: Import a Book You Own
                - generic [ref=e315]:
                  - generic [ref=e316]:
                    - generic [ref=e317]: Book title
                    - textbox [ref=e318]: "MasterLife 1: The Disciple’s Cross"
                  - generic [ref=e319]:
                    - generic [ref=e320]: Workflow
                    - combobox [ref=e321]:
                      - option "Auto-detect" [selected]
                      - option "Already a daily study"
                      - option "Turn into daily Bible Study"
                - generic [ref=e322]:
                  - generic [ref=e323]: Chronicle will preserve books that already have daily sessions. If not, it will generate a daily Bible-study plan from the OCR text, following source sections when it can so the finished path feels closer to the book you imported.
                  - button "Add to Discipleship" [ref=e324] [cursor=pointer]
                - generic [ref=e325]: "Current library: 1 book."
              - generic [ref=e326]:
                - generic [ref=e327]: Import Progress
                - generic [ref=e329]:
                  - generic [ref=e330]:
                    - generic [ref=e331]: No active import
                    - generic [ref=e332]: Start OCR or import and Chronicle will show live progress here.
                  - generic [ref=e333]: 0%
              - generic [ref=e336]:
                - generic [ref=e337]:
                  - generic [ref=e338]:
                    - generic [ref=e339]: Chronicle Study Library
                    - generic [ref=e340]: 0 imported books · 0 uploaded · 0 OCR complete · 0 structured
                    - generic [ref=e341]: Library manifest v1 · record schema v1 · owned book schema v2
                  - button "Refresh Library" [ref=e342] [cursor=pointer]
                - generic [ref=e344]: No imported books yet. Upload a PDF above and Chronicle will track it here from upload to OCR to structured study.
              - generic [ref=e345]:
                - generic [ref=e346]:
                  - generic [ref=e347]:
                    - generic [ref=e348]: Discipleship Workbook QA
                    - generic [ref=e349]: "Chronicle checks workbook days for response cues and whether overlays cover the pages that need interaction. Last audit: 5/7/2026, 11:04:32 PM."
                  - generic [ref=e350]:
                    - button "Refresh QA" [ref=e351] [cursor=pointer]
                    - button "Run Workbook Sync" [ref=e352] [cursor=pointer]
                    - button "Run Workbook QA" [ref=e353] [cursor=pointer]
                - generic [ref=e354]:
                  - generic [ref=e355]:
                    - generic [ref=e356]: Audited days
                    - generic [ref=e357]: "0"
                  - generic [ref=e358]:
                    - generic [ref=e359]: Cue-safe days
                    - generic [ref=e360]: "0"
                  - generic [ref=e361]:
                    - generic [ref=e362]: Uncovered cue pages
                    - generic [ref=e363]: "0"
                  - generic [ref=e364]:
                    - generic [ref=e365]: Days with no prompts
                    - generic [ref=e366]: "0"
                - generic [ref=e368]: Chronicle has not generated a workbook QA audit yet. Run the discipleship sync/QA pipeline and the day-level readiness map will appear here.
              - generic [ref=e369]:
                - generic [ref=e370]: OCR Artifacts
                - generic [ref=e371]:
                  - generic [ref=e372]: books/masterlife-book1/masterlife-book1-p0001-0026.json
                  - generic [ref=e373]: books/masterlife-book1/masterlife-book1-p0001-0026.ocr.pdf
                  - generic [ref=e374]: books/masterlife-book1/masterlife-book1-p0001-0026.txt
                  - generic [ref=e375]: books/masterlife-book1/masterlife-book1-p0027-0052.json
                  - generic [ref=e376]: books/masterlife-book1/masterlife-book1-p0027-0052.ocr.pdf
                  - generic [ref=e377]: books/masterlife-book1/masterlife-book1-p0027-0052.txt
                  - generic [ref=e378]: books/masterlife-book1/masterlife-book1-p0053-0078.json
                  - generic [ref=e379]: books/masterlife-book1/masterlife-book1-p0053-0078.ocr.pdf
                  - generic [ref=e380]: books/masterlife-book1/masterlife-book1-p0053-0078.txt
                  - generic [ref=e381]: books/masterlife-book1/masterlife-book1-p0079-0104.json
                  - generic [ref=e382]: books/masterlife-book1/masterlife-book1-p0079-0104.ocr.pdf
                  - generic [ref=e383]: books/masterlife-book1/masterlife-book1-p0079-0104.txt
                  - generic [ref=e384]: books/masterlife-book1/masterlife-book1-p0105-0130.json
                  - generic [ref=e385]: books/masterlife-book1/masterlife-book1-p0105-0130.ocr.pdf
                  - generic [ref=e386]: books/masterlife-book1/masterlife-book1-p0105-0130.txt
                  - generic [ref=e387]: books/masterlife-book1/masterlife-book1-p0131-0156.json
                  - generic [ref=e388]: books/masterlife-book1/masterlife-book1-p0131-0156.ocr.pdf
                  - generic [ref=e389]: books/masterlife-book1/masterlife-book1-p0131-0156.txt
                  - generic [ref=e390]: books/masterlife-book1/masterlife-book1-p0157-0182.json
                  - generic [ref=e391]: books/masterlife-book1/masterlife-book1-p0157-0182.ocr.pdf
                  - generic [ref=e392]: books/masterlife-book1/masterlife-book1-p0157-0182.txt
                  - generic [ref=e393]: books/masterlife-book1/masterlife-book1-p0183-0208.json
                  - generic [ref=e394]: books/masterlife-book1/masterlife-book1-p0183-0208.ocr.pdf
                  - generic [ref=e395]: books/masterlife-book1/masterlife-book1-p0183-0208.txt
                  - generic [ref=e396]: books/masterlife-book1/masterlife-book1-p0209-0234.json
                  - generic [ref=e397]: books/masterlife-book1/masterlife-book1-p0209-0234.ocr.pdf
                  - generic [ref=e398]: books/masterlife-book1/masterlife-book1-p0209-0234.txt
                  - generic [ref=e399]: books/masterlife-book1/masterlife-book1-p0235-0260.json
                  - generic [ref=e400]: books/masterlife-book1/masterlife-book1-p0235-0260.ocr.pdf
                  - generic [ref=e401]: books/masterlife-book1/masterlife-book1-p0235-0260.txt
                  - generic [ref=e402]: books/masterlife-book1/masterlife-book1-p0261-0286.json
                  - generic [ref=e403]: books/masterlife-book1/masterlife-book1-p0261-0286.ocr.pdf
                  - generic [ref=e404]: books/masterlife-book1/masterlife-book1-p0261-0286.txt
                  - generic [ref=e405]: books/masterlife-book1/masterlife-book1-p0287-0312.json
                  - generic [ref=e406]: books/masterlife-book1/masterlife-book1-p0287-0312.ocr.pdf
                  - generic [ref=e407]: books/masterlife-book1/masterlife-book1-p0287-0312.txt
                  - generic [ref=e408]: books/masterlife-book1/masterlife-book1-p0313-0338.json
                  - generic [ref=e409]: books/masterlife-book1/masterlife-book1-p0313-0338.ocr.pdf
                  - generic [ref=e410]: books/masterlife-book1/masterlife-book1-p0313-0338.txt
                  - generic [ref=e411]: books/masterlife-book1/masterlife-book1-p0339-0364.json
                  - generic [ref=e412]: books/masterlife-book1/masterlife-book1-p0339-0364.ocr.pdf
                  - generic [ref=e413]: books/masterlife-book1/masterlife-book1-p0339-0364.txt
                  - generic [ref=e414]: books/masterlife-book1/masterlife-book1-p0365-0390.json
                  - generic [ref=e415]: books/masterlife-book1/masterlife-book1-p0365-0390.ocr.pdf
                  - generic [ref=e416]: books/masterlife-book1/masterlife-book1-p0365-0390.txt
                  - generic [ref=e417]: books/masterlife-book1/masterlife-book1-p0391-0416.json
                  - generic [ref=e418]: books/masterlife-book1/masterlife-book1-p0391-0416.ocr.pdf
                  - generic [ref=e419]: books/masterlife-book1/masterlife-book1-p0391-0416.txt
                  - generic [ref=e420]: books/masterlife-book1/masterlife-book1-p0417-0442.json
                  - generic [ref=e421]: books/masterlife-book1/masterlife-book1-p0417-0442.ocr.pdf
                  - generic [ref=e422]: books/masterlife-book1/masterlife-book1-p0417-0442.txt
                  - generic [ref=e423]: books/masterlife-book1/masterlife-book1-p0443-0468.json
                  - generic [ref=e424]: books/masterlife-book1/masterlife-book1-p0443-0468.ocr.pdf
                  - generic [ref=e425]: books/masterlife-book1/masterlife-book1-p0443-0468.txt
                  - generic [ref=e426]: books/masterlife-book1/masterlife-book1-p0469-0494.json
                  - generic [ref=e427]: books/masterlife-book1/masterlife-book1-p0469-0494.ocr.pdf
                  - generic [ref=e428]: books/masterlife-book1/masterlife-book1-p0469-0494.txt
                  - generic [ref=e429]: books/masterlife-book1/masterlife-book1-p0495-0520.json
                  - generic [ref=e430]: books/masterlife-book1/masterlife-book1-p0495-0520.ocr.pdf
                  - generic [ref=e431]: books/masterlife-book1/masterlife-book1-p0495-0520.txt
                  - generic [ref=e432]: books/masterlife-book1/masterlife-book1-p0521-0546.json
                  - generic [ref=e433]: books/masterlife-book1/masterlife-book1-p0521-0546.ocr.pdf
                  - generic [ref=e434]: books/masterlife-book1/masterlife-book1-p0521-0546.txt
                  - generic [ref=e435]: books/masterlife-book1/masterlife-book1-p0547-0572.json
                  - generic [ref=e436]: books/masterlife-book1/masterlife-book1-p0547-0572.ocr.pdf
                  - generic [ref=e437]: books/masterlife-book1/masterlife-book1-p0547-0572.txt
                  - generic [ref=e438]: books/masterlife-book1/masterlife-book1-p0573-0579.json
                  - generic [ref=e439]: books/masterlife-book1/masterlife-book1-p0573-0579.ocr.pdf
                  - generic [ref=e440]: books/masterlife-book1/masterlife-book1-p0573-0579.txt
                  - generic [ref=e441]: books/masterlife-book1/masterlife-book1.book.txt
                  - generic [ref=e442]: books/masterlife-book1/masterlife-book1.segments.json
                  - generic [ref=e443]: books/masterlife-segment-test/masterlife-segment-test-p0001-0002.json
                  - generic [ref=e444]: books/masterlife-segment-test/masterlife-segment-test-p0001-0002.ocr.pdf
                  - generic [ref=e445]: books/masterlife-segment-test/masterlife-segment-test-p0001-0002.txt
                  - generic [ref=e446]: books/masterlife-segment-test/masterlife-segment-test-p0003-0004.json
                  - generic [ref=e447]: books/masterlife-segment-test/masterlife-segment-test-p0003-0004.ocr.pdf
                  - generic [ref=e448]: books/masterlife-segment-test/masterlife-segment-test-p0003-0004.txt
                  - generic [ref=e449]: books/masterlife-segment-test/masterlife-segment-test-p0005-0006.json
                  - generic [ref=e450]: books/masterlife-segment-test/masterlife-segment-test-p0005-0006.ocr.pdf
                  - generic [ref=e451]: books/masterlife-segment-test/masterlife-segment-test-p0005-0006.txt
                  - generic [ref=e452]: books/masterlife-segment-test/masterlife-segment-test-p0007-0008.json
                  - generic [ref=e453]: books/masterlife-segment-test/masterlife-segment-test-p0007-0008.ocr.pdf
                  - generic [ref=e454]: books/masterlife-segment-test/masterlife-segment-test-p0007-0008.txt
                  - generic [ref=e455]: books/masterlife-segment-test/masterlife-segment-test-p0009-0010.json
                  - generic [ref=e456]: books/masterlife-segment-test/masterlife-segment-test-p0009-0010.ocr.pdf
                  - generic [ref=e457]: books/masterlife-segment-test/masterlife-segment-test-p0009-0010.txt
                  - generic [ref=e458]: books/masterlife-segment-test/masterlife-segment-test.book.txt
                  - generic [ref=e459]: books/masterlife-segment-test/masterlife-segment-test.segments.json
                  - generic [ref=e460]: books/progress-check/progress-check-p0001-0002.json
                  - generic [ref=e461]: books/progress-check/progress-check-p0001-0002.ocr.pdf
                  - generic [ref=e462]: books/progress-check/progress-check-p0001-0002.txt
                  - generic [ref=e463]: books/progress-check/progress-check-p0003-0004.json
                  - generic [ref=e464]: books/progress-check/progress-check-p0003-0004.ocr.pdf
                  - generic [ref=e465]: books/progress-check/progress-check-p0003-0004.txt
                  - generic [ref=e466]: books/progress-check/progress-check-p0005-0006.json
                  - generic [ref=e467]: books/progress-check/progress-check-p0005-0006.ocr.pdf
                  - generic [ref=e468]: books/progress-check/progress-check-p0005-0006.txt
                  - generic [ref=e469]: books/progress-check/progress-check-p0007-0008.json
                  - generic [ref=e470]: books/progress-check/progress-check-p0007-0008.ocr.pdf
                  - generic [ref=e471]: books/progress-check/progress-check-p0007-0008.txt
                  - generic [ref=e472]: books/progress-check/progress-check-p0009-0010.json
                  - generic [ref=e473]: books/progress-check/progress-check-p0009-0010.ocr.pdf
                  - generic [ref=e474]: books/progress-check/progress-check-p0009-0010.txt
                  - generic [ref=e475]: books/progress-check/progress-check.book.txt
                  - generic [ref=e476]: books/progress-check/progress-check.segments.json
                  - generic [ref=e477]: fixtures/sparse-general-book.txt
                  - generic [ref=e478]: fixtures/structured-general-book.txt
                  - generic [ref=e479]: masterlife-book1-source.json
                  - generic [ref=e480]: masterlife-sample.json
                  - generic [ref=e481]: masterlife-sample.ocr.pdf
                  - generic [ref=e482]: masterlife-sample.txt
              - generic [ref=e483]:
                - generic [ref=e484]: Last Import Log
                - generic [ref=e485]: No OCR or import run yet.
            - generic [ref=e486]:
              - generic [ref=e488]: Export
              - generic [ref=e489]:
                - generic [ref=e490]:
                  - generic [ref=e491]: Export Chronicle
                  - generic [ref=e492]: Download all entries as Markdown or JSON
                - generic [ref=e494]:
                  - button ".md" [ref=e495] [cursor=pointer]
                  - button ".json" [ref=e496] [cursor=pointer]
              - generic [ref=e497]:
                - generic [ref=e498]:
                  - generic [ref=e499]: Export Legacy Memoir
                  - generic [ref=e500]: Download the Legacy View as a formatted PDF
                - button "Export PDF" [ref=e502] [cursor=pointer]
        - generic [ref=e503]:
          - generic [ref=e504]:
            - generic [ref=e505]: Account
            - generic [ref=e506]:
              - generic [ref=e507]:
                - generic [ref=e508]: User
                - generic [ref=e509]: Chris
              - generic [ref=e510]:
                - generic [ref=e511]: Data
                - generic [ref=e512]: Local Only
              - generic [ref=e513]:
                - generic [ref=e514]: Backup
                - generic [ref=e515]: Snapshot ready
              - generic [ref=e516]:
                - generic [ref=e517]: Version
                - generic [ref=e518]: 0.1.0
          - generic [ref=e519]:
            - generic [ref=e520]: Your Chronicle
            - generic [ref=e521]:
              - generic [ref=e522]:
                - generic [ref=e523]: "5"
                - generic [ref=e524]: Entries
              - generic [ref=e525]:
                - generic [ref=e526]: "4"
                - generic [ref=e527]: Days Active
              - generic [ref=e528]:
                - generic [ref=e529]: "12"
                - generic [ref=e530]: Day Streak
              - generic [ref=e531]:
                - generic [ref=e532]: "2"
                - generic [ref=e533]: Months Deep
          - generic [ref=e534]:
            - generic [ref=e535]: Library Health
            - generic [ref=e536]:
              - generic [ref=e537]:
                - generic [ref=e538]: 1 owned book
                - generic [ref=e539]: Imported discipleship sources available to Chronicle.
              - generic [ref=e540]:
                - generic [ref=e541]: 1 answered prayer
                - generic [ref=e542]: Prayer history now folded into Chronicle's formation signals.
              - generic [ref=e543]:
                - generic [ref=e544]: 5 prayer follow-ups due
                - generic [ref=e545]: Open requests that Chronicle thinks need another touch right now.
              - generic [ref=e546]:
                - generic [ref=e547]: Portable snapshot available
                - generic [ref=e548]: "Latest snapshot: 5/7/2026"
      - complementary [ref=e549]:
        - button "Collapse Chronicle AI" [expanded] [ref=e550] [cursor=pointer]:
          - generic [ref=e551]: ▶
          - generic [ref=e552]: Hide
        - generic [ref=e553]:
          - generic [ref=e554]:
            - generic [ref=e555]: Companion
            - generic [ref=e556]: Chronicle AI
            - generic [ref=e557]: Settings
          - button "Clear" [ref=e558] [cursor=pointer]
        - generic [ref=e559]:
          - generic [ref=e560]: Role
          - combobox "Role" [ref=e561]:
            - option "Bible Study Agent"
            - option "Discipleship Coach"
            - option "Prayer Guide"
            - option "Reflection Guide" [selected]
          - generic [ref=e562]: Meaning-making, journaling, growth synthesis, and Chronicle-centered reflection.
          - generic [ref=e563]: Voice
          - combobox "Voice" [ref=e564]:
            - option "The Guide" [selected]
            - option "The Oracle"
            - option "The Breakthrough Coach"
            - option "The Prayer Guide"
          - generic [ref=e565]: Warm, clear, formation-centered Scripture teaching with one practical next step.
          - generic [ref=e566]: Reflection Guide
          - generic [ref=e567]: "Thread: Settings · Chronicle"
          - generic [ref=e568]: "Stored context threads on this page: 3"
          - generic [ref=e569]:
            - button "Settings · Chronicle" [ref=e570] [cursor=pointer]
            - button "Settings · Chronicle" [ref=e571] [cursor=pointer]
        - generic [ref=e573]: Ask about the page you are on, trace a theme, summarize a passage, or turn your notes into a prayer or study reflection. Chronicle will keep this thread attached to the current passage, day, or book so you can reopen it later from the same workflow.
        - generic [ref=e574]:
          - generic [ref=e575]:
            - button "What pattern do you see here?" [ref=e576] [cursor=pointer]
            - button "Turn this into reflection prompts" [ref=e577] [cursor=pointer]
            - button "What is God teaching me through this season?" [ref=e578] [cursor=pointer]
            - button "Give me a Chronicle reflection" [ref=e579] [cursor=pointer]
          - generic [ref=e580]:
            - button "Save to Chronicle" [disabled] [ref=e581]
            - button "Use in Prayer" [disabled] [ref=e582]
            - button "Add Prayer Request" [disabled] [ref=e583]
          - generic [ref=e584]:
            - button "Save Reflection" [disabled] [ref=e585]
            - button "Save Insight" [disabled] [ref=e586]
            - button "Save as Prayer" [disabled] [ref=e587]
            - button "Save as Study" [disabled] [ref=e588]
            - button "Open Passage" [disabled] [ref=e589]
            - button "Open Themes" [disabled] [ref=e590]
            - button "Open Echoes" [disabled] [ref=e591]
            - button "Open Greek" [disabled] [ref=e592]
            - button "Save Prompt Set" [ref=e593] [cursor=pointer]
            - button "Open Chronicle" [ref=e594] [cursor=pointer]
          - generic [ref=e595]:
            - button "Open Study" [ref=e596] [cursor=pointer]
            - button "Open Discipleship" [ref=e597] [cursor=pointer]
            - button "Open Workbook" [ref=e598] [cursor=pointer]
          - textbox "Ask guide about settings..." [ref=e599]
          - generic [ref=e600]:
            - generic [ref=e601]: Uses your local page context and the selected Chronicle voice.
            - button "Send" [disabled] [ref=e602]
    - contentinfo [ref=e603]:
      - generic [ref=e604]: Primary Scripture display uses the NKJV® (© 1982 Thomas Nelson), with additional licensed sources where available.
      - generic [ref=e605]: Local-first Bible study and spiritual formation.
      - generic [ref=e606]: Chronicle v0.1.0
  - generic [ref=e607] [cursor=pointer]:
    - generic [ref=e608]: 💾
    - text: Snapshot created at /Users/chris/Desktop/CODE/chronicle/data/sync-snapshots/snapshot-2026-05-08T03-23-14-386Z.json
```

# Test source

```ts
  97  |   }
  98  |   const ocrCompleteOrStructuredRecord = libraryPayload.records.find((record) => ['ocr_complete', 'structured'].includes(record.status) && record.ocrTextPath);
  99  |   if (ocrCompleteOrStructuredRecord) {
  100 |     expect(ocrCompleteOrStructuredRecord.ocrQuality).toBeTruthy();
  101 |     expect(typeof ocrCompleteOrStructuredRecord.ocrQuality.pageCount).toBe('number');
  102 |   }
  103 |   const needsRepairRecord = libraryPayload.records.find((record) => record.ocrQuality && record.ocrQuality.confidence !== 'high');
  104 |   if (needsRepairRecord) {
  105 |     await expect(page.getByRole('button', { name: /Repair OCR|Re-run OCR/ }).first()).toBeVisible();
  106 |   }
  107 |   await expect(page.getByText('Discipleship Workbook QA')).toBeVisible();
  108 |   await expect(page.getByRole('button', { name: 'Refresh QA' })).toBeVisible();
  109 |   await expect(page.getByRole('button', { name: 'Run Workbook Sync' })).toBeVisible();
  110 |   await expect(page.getByRole('button', { name: 'Run Workbook QA' })).toBeVisible();
  111 |   await expect(page.getByText(/Audited days|Cue-safe days|Uncovered cue pages/).first()).toBeVisible();
  112 |   if ((libraryPayload.records?.length || 0) > 0) {
  113 |     const readinessVisible = await page.getByText('Book readiness').isVisible().catch(() => false);
  114 |     const noAuditYetVisible = await page.getByText(/has not generated a workbook QA audit yet|No workbook response cues were found/i).first().isVisible().catch(() => false);
  115 |     expect(readinessVisible || noAuditYetVisible).toBeTruthy();
  116 |   }
  117 |   const reviewWorkbookButton = page.getByRole('button', { name: 'Review Workbook' }).first();
  118 |   if (await reviewWorkbookButton.isVisible().catch(() => false)) {
  119 |     await reviewWorkbookButton.click();
  120 |     await expect(page.getByText('Discipleship', { exact: true }).first()).toBeVisible();
  121 |     const workbookImage = page.locator('img[alt*="page"]').first();
  122 |     const workbookModeText = page.getByText(/Workbook Mode|These overlays and the Study prompts use the same saved answers/i).first();
  123 |     const sourceFallbackText = page.getByText(/No scanned source pages are available yet for this day/i).first();
  124 |     const studyStructureText = page.getByText('Day Structure', { exact: true }).first();
  125 |     const imageVisible = await workbookImage.isVisible().catch(() => false);
  126 |     if (imageVisible) {
  127 |       await expect(workbookImage).toHaveAttribute('src', /book-page-image/);
  128 |     } else {
  129 |       await expect(workbookModeText.or(sourceFallbackText).or(studyStructureText)).toBeVisible();
  130 |     }
  131 |     await page.goto(appUrl('/settings'));
  132 |     await settingsNavItem(page, 'Data & Privacy').click();
  133 |     await expect.poll(async () => await page.getByText('Storage').first().isVisible().catch(() => false)).toBeTruthy();
  134 |   } else {
  135 |     await expect(page.getByText(/has not generated a workbook QA audit yet|No workbook response cues were found/i).first()).toBeVisible();
  136 |   }
  137 |   await expect(page.getByText('Chronicle Sync Snapshot')).toBeVisible();
  138 |   await expect(page.getByText('Data Health Center')).toBeVisible();
  139 |   await expect(page.getByText(/Cache gaps|OCR repair queue|Workbook flags/).first()).toBeVisible();
  140 |   await expect(page.getByRole('button', { name: 'Create Chronicle Snapshot' })).toBeVisible();
  141 |   await expect(page.getByRole('button', { name: 'Import & Merge Snapshot File' })).toBeVisible();
  142 |   await expect(page.getByRole('button', { name: 'Merge Latest Snapshot' })).toBeVisible();
  143 |   await expect(page.getByRole('button', { name: 'Download Latest Snapshot' })).toBeVisible();
  144 |   await expect(page.getByText(/Portable merge policy:/).first()).toBeVisible();
  145 | });
  146 | 
  147 | test('study library books can be deleted without touching the user source outside Chronicle', async ({ page }) => {
  148 |   const uniqueStem = `delete-me-${Date.now()}`;
  149 |   const uploadResponse = await page.request.post(appUrl('/api/study-imports/upload-book'), {
  150 |     data: {
  151 |       fileName: `${uniqueStem}.pdf`,
  152 |       contentBase64: Buffer.from('%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n').toString('base64'),
  153 |     },
  154 |   });
  155 |   expect(uploadResponse.ok()).toBeTruthy();
  156 |   const uploadPayload = await uploadResponse.json();
  157 |   expect(uploadPayload.recordId || '').not.toEqual('');
  158 | 
  159 |   const beforeDeleteResponse = await page.request.get(appUrl('/api/study-imports/library'));
  160 |   expect(beforeDeleteResponse.ok()).toBeTruthy();
  161 |   const beforeDeletePayload = await beforeDeleteResponse.json();
  162 |   expect(beforeDeletePayload.records.some((record) => record.id === uploadPayload.recordId)).toBeTruthy();
  163 | 
  164 |   const deleteResponse = await page.request.post(appUrl('/api/study-imports/delete-book'), {
  165 |     data: { bookId: uploadPayload.recordId },
  166 |   });
  167 |   expect(deleteResponse.ok()).toBeTruthy();
  168 |   const deletePayload = await deleteResponse.json();
  169 |   expect(deletePayload.ok).toBeTruthy();
  170 |   expect(deletePayload.bookId).toBe(uploadPayload.recordId);
  171 |   expect(Array.isArray(deletePayload.removedPaths)).toBeTruthy();
  172 |   expect(deletePayload.removedPaths.length).toBeGreaterThan(0);
  173 | 
  174 |   const afterDeleteResponse = await page.request.get(appUrl('/api/study-imports/library'));
  175 |   expect(afterDeleteResponse.ok()).toBeTruthy();
  176 |   const afterDeletePayload = await afterDeleteResponse.json();
  177 |   expect(afterDeletePayload.records.some((record) => record.id === uploadPayload.recordId)).toBeFalsy();
  178 | });
  179 | 
  180 | test('settings data and privacy can create a Chronicle sync snapshot', async ({ page }) => {
  181 |   await page.goto(appUrl('/settings'));
  182 |   await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });
  183 | 
  184 |   await settingsNavItem(page, 'Data & Privacy').click();
  185 |   await expect.poll(async () => await page.getByText('Storage').first().isVisible().catch(() => false)).toBeTruthy();
  186 |   const [exportResponse] = await Promise.all([
  187 |     page.waitForResponse((response) =>
  188 |       response.url().includes('/api/chronicle-sync/export') && response.request().method() === 'POST',
  189 |     ),
  190 |     page.getByRole('button', { name: 'Create Chronicle Snapshot' }).click(),
  191 |   ]);
  192 |   expect(exportResponse.ok()).toBeTruthy();
  193 |   const exportPayload = await exportResponse.json();
  194 |   expect(exportPayload.snapshot?.id || '').toContain('snapshot-');
  195 |   expect(exportPayload.snapshot?.schemaVersion || 0).toBeGreaterThan(0);
  196 |   expect(exportPayload.snapshot?.appStateVersion || 0).toBeGreaterThan(0);
> 197 |   const syncStatusResponse = await page.request.get(appUrl('/api/chronicle-sync/status'));
      |                                                 ^ Error: apiRequestContext.get: read ECONNRESET
  198 |   expect(syncStatusResponse.ok()).toBeTruthy();
  199 |   const syncStatusPayload = await syncStatusResponse.json();
  200 |   expect(syncStatusPayload.latestSnapshot?.id || '').toContain('snapshot-');
  201 |   expect(syncStatusPayload.summary?.snapshotSchemaVersion || 0).toBeGreaterThan(0);
  202 |   expect(syncStatusPayload.summary?.appStateVersion || 0).toBeGreaterThan(0);
  203 |   expect(syncStatusPayload.snapshots?.length || 0).toBeGreaterThan(0);
  204 |   await expect(page.getByText(/Snapshot schema v\d+ · app state v\d+/).first()).toBeVisible();
  205 |   const downloadResponse = await page.request.get(appUrl('/api/chronicle-sync/download-latest'));
  206 |   expect(downloadResponse.ok()).toBeTruthy();
  207 |   expect((await downloadResponse.text())).toContain('appState');
  208 | });
  209 | 
  210 | test('legacy Chronicle snapshot imports are migrated onto the current app-state contract', async ({ page }) => {
  211 |   const legacySnapshot = {
  212 |     id: '"snapshot-legacy-migration-check"',
  213 |     createdAt: '2026-04-01T12:00:00.000Z',
  214 |     schemaVersion: 1,
  215 |     appStateVersion: 1,
  216 |     appState: {
  217 |       theme: 'dark',
  218 |       translation: 'ESV',
  219 |       bibleView: {
  220 |         book: 'John',
  221 |         chapter: 1,
  222 |       },
  223 |       chronicleEntries: [],
  224 |       prayerItems: [],
  225 |       scriptureBookmarks: [],
  226 |       ownedBooks: [],
  227 |     },
  228 |   };
  229 | 
  230 |   const importResponse = await page.request.post(appUrl('/api/chronicle-sync/import'), {
  231 |     data: {
  232 |       snapshot: legacySnapshot,
  233 |     },
  234 |   });
  235 |   expect(importResponse.ok()).toBeTruthy();
  236 |   const importPayload = await importResponse.json();
  237 |   expect(importPayload.snapshot?.schemaVersion || 0).toBeGreaterThanOrEqual(2);
  238 |   expect(importPayload.snapshot?.appStateVersion || 0).toBeGreaterThanOrEqual(6);
  239 |   expect(importPayload.appState?.translation).toBe('NKJV');
  240 |   expect(Array.isArray(importPayload.appState?.bibleView?.activeThemeIds)).toBeTruthy();
  241 | 
  242 |   const restoreResponse = await page.request.get(`${appUrl('/api/chronicle-sync/restore')}?snapshotId=${encodeURIComponent(importPayload.snapshot.id)}`);
  243 |   expect(restoreResponse.ok()).toBeTruthy();
  244 |   const restorePayload = await restoreResponse.json();
  245 |   expect(restorePayload.appState?.translation).toBe('NKJV');
  246 |   expect(restorePayload.snapshot?.schemaVersion || 0).toBeGreaterThanOrEqual(2);
  247 |   expect(restorePayload.snapshot?.appStateVersion || 0).toBeGreaterThanOrEqual(6);
  248 | });
  249 | 
  250 | test('settings scripture shows local bible library and theme cache controls', async ({ page }) => {
  251 |   await page.goto(appUrl('/settings'));
  252 |   await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });
  253 | 
  254 |   await settingsNavItem(page, 'Scripture').click();
  255 |   await expect(page.getByText('Chronicle Bible Library')).toBeVisible();
  256 |   await expect(page.getByText('Theme Analysis Cache')).toBeVisible();
  257 |   await expect(page.getByRole('button', { name: /Refresh Bible Library|Refreshing…/ })).toBeVisible();
  258 |   await expect(page.getByRole('button', { name: /Build Missing Analyses|Building…/ })).toBeVisible();
  259 |   await expect(page.getByRole('button', { name: 'Rebuild Selected' })).toBeVisible();
  260 |   await expect(page.getByRole('button', { name: 'Build Missing' }).first()).toBeVisible();
  261 |   await expect(page.getByText(/cached ·/).first()).toBeVisible();
  262 |   const cacheResponse = await page.request.get(`${appUrl('/api/theme-analysis-cache')}?book=John&chapter=1&translation=nkjv`);
  263 |   expect(cacheResponse.ok()).toBeTruthy();
  264 |   const cachePayload = await cacheResponse.json();
  265 |   expect(cachePayload.version || '').not.toEqual('');
  266 |   expect(Array.isArray(cachePayload.themes)).toBeTruthy();
  267 |   expect(cachePayload.themes.length).toBeGreaterThan(0);
  268 | });
  269 | 
  270 | test('settings AI companion exposes role, persona, and provider controls', async ({ page }) => {
  271 |   await page.goto(appUrl('/settings'));
  272 |   await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });
  273 | 
  274 |   await settingsNavItem(page, 'AI Companion').click();
  275 |   await expect(page.getByText('Companion Roles')).toBeVisible();
  276 |   await expect(page.getByText('Provider Routing')).toBeVisible();
  277 |   await expect(page.getByText('Default Agent Role')).toBeVisible();
  278 |   await expect(page.getByText('Chronicle currently remembers')).toBeVisible();
  279 |   await expect(page.getByText('Default Persona')).toBeVisible();
  280 |   await expect(page.getByText('Bible Reader Provider')).toBeVisible();
  281 |   await expect(page.getByText(/Installed providers|Saved analyses/).first()).toBeVisible();
  282 |   await expect(page.getByText('Voice Platform')).toBeVisible();
  283 |   await expect(page.getByText('Whisper and Piper', { exact: true })).toBeVisible();
  284 |   await expect(page.getByText('Home Assistant Bridge', { exact: true })).toBeVisible();
  285 |   await expect(page.getByText('LiveKit Sessions', { exact: true })).toBeVisible();
  286 |   await expect(page.getByRole('button', { name: /Refresh Voice Status|Refreshing…/ })).toBeVisible();
  287 |   const voiceStatusResponse = await page.request.get(appUrl('/api/voice/status'));
  288 |   expect(voiceStatusResponse.ok()).toBeTruthy();
  289 |   const voiceStatusPayload = await voiceStatusResponse.json();
  290 |   expect(voiceStatusPayload.ok).toBeTruthy();
  291 |   expect(voiceStatusPayload.providers).toBeTruthy();
  292 |   expect(typeof voiceStatusPayload.providers.whisperCli.available).toBe('boolean');
  293 | });
  294 | 
  295 | test('settings about page exposes onboarding and recovery guidance', async ({ page }) => {
  296 |   await page.goto(appUrl('/settings'));
  297 |   await page.getByRole('navigation', { name: 'Settings sections' }).waitFor({ timeout: 10000 });
```