# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/app-smoke.spec.js >> chronicle key surfaces stay usable on a phone-width viewport
- Location: tests/app-smoke.spec.js:209:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Reading Layer Status')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Reading Layer Status')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img "Chronicle" [ref=e6]
      - generic [ref=e7]:
        - heading "CHRONICLE" [level=1] [ref=e8]
        - paragraph [ref=e9]: Daily formation
    - navigation "Primary" [ref=e10]:
      - button "Today" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: Today
      - button "Bible" [active] [ref=e17] [cursor=pointer]:
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
    - banner [ref=e57]:
      - button "Search Chronicle..." [ref=e58] [cursor=pointer]:
        - img [ref=e59]
        - generic [ref=e62]: Search Chronicle...
      - generic [ref=e63]:
        - button "Open Chronicle AI" [ref=e64] [cursor=pointer]:
          - img [ref=e65]
        - button "New Chronicle entry (⌘N)" [ref=e68] [cursor=pointer]:
          - img [ref=e69]
        - button "Notifications" [ref=e70] [cursor=pointer]:
          - img [ref=e71]
        - button "Dark mode" [ref=e73] [cursor=pointer]:
          - img [ref=e74]
    - generic [ref=e76]:
      - generic [ref=e79]:
        - generic [ref=e80]:
          - button "Psalms" [ref=e81] [cursor=pointer]
          - generic [ref=e82]: ›
          - generic [ref=e83]: Psalm 23
          - generic [ref=e84]:
            - button "‹" [ref=e85] [cursor=pointer]
            - button "›" [ref=e86] [cursor=pointer]
          - generic [ref=e87]:
            - button "1" [ref=e88] [cursor=pointer]
            - button "2" [ref=e89] [cursor=pointer]
            - button "3" [ref=e90] [cursor=pointer]
            - button "4" [ref=e91] [cursor=pointer]
            - button "5" [ref=e92] [cursor=pointer]
            - button "6" [ref=e93] [cursor=pointer]
            - button "7" [ref=e94] [cursor=pointer]
            - button "8" [ref=e95] [cursor=pointer]
            - button "9" [ref=e96] [cursor=pointer]
            - button "10" [ref=e97] [cursor=pointer]
            - button "11" [ref=e98] [cursor=pointer]
            - button "12" [ref=e99] [cursor=pointer]
            - button "13" [ref=e100] [cursor=pointer]
            - button "14" [ref=e101] [cursor=pointer]
            - button "15" [ref=e102] [cursor=pointer]
            - button "16" [ref=e103] [cursor=pointer]
            - button "17" [ref=e104] [cursor=pointer]
            - button "18" [ref=e105] [cursor=pointer]
            - button "19" [ref=e106] [cursor=pointer]
            - button "20" [ref=e107] [cursor=pointer]
            - button "21" [ref=e108] [cursor=pointer]
            - button "22" [ref=e109] [cursor=pointer]
            - button "23" [ref=e110] [cursor=pointer]
            - button "24" [ref=e111] [cursor=pointer]
            - button "25" [ref=e112] [cursor=pointer]
            - button "26" [ref=e113] [cursor=pointer]
            - button "27" [ref=e114] [cursor=pointer]
            - button "28" [ref=e115] [cursor=pointer]
            - button "29" [ref=e116] [cursor=pointer]
            - button "30" [ref=e117] [cursor=pointer]
            - button "31" [ref=e118] [cursor=pointer]
            - button "32" [ref=e119] [cursor=pointer]
            - button "33" [ref=e120] [cursor=pointer]
            - button "34" [ref=e121] [cursor=pointer]
            - button "35" [ref=e122] [cursor=pointer]
            - button "36" [ref=e123] [cursor=pointer]
            - button "37" [ref=e124] [cursor=pointer]
            - button "38" [ref=e125] [cursor=pointer]
            - button "39" [ref=e126] [cursor=pointer]
            - button "40" [ref=e127] [cursor=pointer]
            - button "41" [ref=e128] [cursor=pointer]
            - button "42" [ref=e129] [cursor=pointer]
            - button "43" [ref=e130] [cursor=pointer]
            - button "44" [ref=e131] [cursor=pointer]
            - button "45" [ref=e132] [cursor=pointer]
            - button "46" [ref=e133] [cursor=pointer]
            - button "47" [ref=e134] [cursor=pointer]
            - button "48" [ref=e135] [cursor=pointer]
            - button "49" [ref=e136] [cursor=pointer]
            - button "50" [ref=e137] [cursor=pointer]
            - button "51" [ref=e138] [cursor=pointer]
            - button "52" [ref=e139] [cursor=pointer]
            - button "53" [ref=e140] [cursor=pointer]
            - button "54" [ref=e141] [cursor=pointer]
            - button "55" [ref=e142] [cursor=pointer]
            - button "56" [ref=e143] [cursor=pointer]
            - button "57" [ref=e144] [cursor=pointer]
            - button "58" [ref=e145] [cursor=pointer]
            - button "59" [ref=e146] [cursor=pointer]
            - button "60" [ref=e147] [cursor=pointer]
            - button "61" [ref=e148] [cursor=pointer]
            - button "62" [ref=e149] [cursor=pointer]
            - button "63" [ref=e150] [cursor=pointer]
            - button "64" [ref=e151] [cursor=pointer]
            - button "65" [ref=e152] [cursor=pointer]
            - button "66" [ref=e153] [cursor=pointer]
            - button "67" [ref=e154] [cursor=pointer]
            - button "68" [ref=e155] [cursor=pointer]
            - button "69" [ref=e156] [cursor=pointer]
            - button "70" [ref=e157] [cursor=pointer]
            - button "71" [ref=e158] [cursor=pointer]
            - button "72" [ref=e159] [cursor=pointer]
            - button "73" [ref=e160] [cursor=pointer]
            - button "74" [ref=e161] [cursor=pointer]
            - button "75" [ref=e162] [cursor=pointer]
            - button "76" [ref=e163] [cursor=pointer]
            - button "77" [ref=e164] [cursor=pointer]
            - button "78" [ref=e165] [cursor=pointer]
            - button "79" [ref=e166] [cursor=pointer]
            - button "80" [ref=e167] [cursor=pointer]
            - button "81" [ref=e168] [cursor=pointer]
            - button "82" [ref=e169] [cursor=pointer]
            - button "83" [ref=e170] [cursor=pointer]
            - button "84" [ref=e171] [cursor=pointer]
            - button "85" [ref=e172] [cursor=pointer]
            - button "86" [ref=e173] [cursor=pointer]
            - button "87" [ref=e174] [cursor=pointer]
            - button "88" [ref=e175] [cursor=pointer]
            - button "89" [ref=e176] [cursor=pointer]
            - button "90" [ref=e177] [cursor=pointer]
            - button "91" [ref=e178] [cursor=pointer]
            - button "92" [ref=e179] [cursor=pointer]
            - button "93" [ref=e180] [cursor=pointer]
            - button "94" [ref=e181] [cursor=pointer]
            - button "95" [ref=e182] [cursor=pointer]
            - button "96" [ref=e183] [cursor=pointer]
            - button "97" [ref=e184] [cursor=pointer]
            - button "98" [ref=e185] [cursor=pointer]
            - button "99" [ref=e186] [cursor=pointer]
            - button "100" [ref=e187] [cursor=pointer]
            - button "101" [ref=e188] [cursor=pointer]
            - button "102" [ref=e189] [cursor=pointer]
            - button "103" [ref=e190] [cursor=pointer]
            - button "104" [ref=e191] [cursor=pointer]
            - button "105" [ref=e192] [cursor=pointer]
            - button "106" [ref=e193] [cursor=pointer]
            - button "107" [ref=e194] [cursor=pointer]
            - button "108" [ref=e195] [cursor=pointer]
            - button "109" [ref=e196] [cursor=pointer]
            - button "110" [ref=e197] [cursor=pointer]
            - button "111" [ref=e198] [cursor=pointer]
            - button "112" [ref=e199] [cursor=pointer]
            - button "113" [ref=e200] [cursor=pointer]
            - button "114" [ref=e201] [cursor=pointer]
            - button "115" [ref=e202] [cursor=pointer]
            - button "116" [ref=e203] [cursor=pointer]
            - button "117" [ref=e204] [cursor=pointer]
            - button "118" [ref=e205] [cursor=pointer]
            - button "119" [ref=e206] [cursor=pointer]
            - button "120" [ref=e207] [cursor=pointer]
            - button "121" [ref=e208] [cursor=pointer]
            - button "122" [ref=e209] [cursor=pointer]
            - button "123" [ref=e210] [cursor=pointer]
            - button "124" [ref=e211] [cursor=pointer]
            - button "125" [ref=e212] [cursor=pointer]
            - button "126" [ref=e213] [cursor=pointer]
            - button "127" [ref=e214] [cursor=pointer]
            - button "128" [ref=e215] [cursor=pointer]
            - button "129" [ref=e216] [cursor=pointer]
            - button "130" [ref=e217] [cursor=pointer]
            - button "131" [ref=e218] [cursor=pointer]
            - button "132" [ref=e219] [cursor=pointer]
            - button "133" [ref=e220] [cursor=pointer]
            - button "134" [ref=e221] [cursor=pointer]
            - button "135" [ref=e222] [cursor=pointer]
            - button "136" [ref=e223] [cursor=pointer]
            - button "137" [ref=e224] [cursor=pointer]
            - button "138" [ref=e225] [cursor=pointer]
            - button "139" [ref=e226] [cursor=pointer]
            - button "140" [ref=e227] [cursor=pointer]
            - button "141" [ref=e228] [cursor=pointer]
            - button "142" [ref=e229] [cursor=pointer]
            - button "143" [ref=e230] [cursor=pointer]
            - button "144" [ref=e231] [cursor=pointer]
            - button "145" [ref=e232] [cursor=pointer]
            - button "146" [ref=e233] [cursor=pointer]
            - button "147" [ref=e234] [cursor=pointer]
            - button "148" [ref=e235] [cursor=pointer]
            - button "149" [ref=e236] [cursor=pointer]
            - button "150" [ref=e237] [cursor=pointer]
          - generic [ref=e238]:
            - combobox "Chronicle local Bible source" [ref=e239] [cursor=pointer]:
              - option "NKJV Local Library" [selected]
              - option "CSB Local Library"
              - option "AMP Local Library"
              - option "NIV Local Library"
              - option "ASV Local Library"
            - generic [ref=e240]: NKJV Local Library
            - button "✦ Theme Overlay" [ref=e241] [cursor=pointer]
            - button "↔ Echoes" [ref=e242] [cursor=pointer]
            - button "◌ Study Colors" [ref=e243] [cursor=pointer]
            - button "α Greek" [disabled] [ref=e244]
            - button "Refresh Themes" [ref=e245] [cursor=pointer]
        - generic [ref=e246]:
          - heading "Psalm 23" [level=2] [ref=e247]
          - paragraph [ref=e249] [cursor=pointer]:
            - superscript [ref=e250]: "1"
            - text: The Lord is my shepherd; I shall not want.
          - paragraph [ref=e252] [cursor=pointer]:
            - superscript [ref=e253]: "2"
            - text: He makes me to lie down in green pastures; He leads me beside the still waters.
          - paragraph [ref=e255] [cursor=pointer]:
            - superscript [ref=e256]: "3"
            - text: He restores my soul; He leads me in the paths of righteousness For His name’s sake.
          - paragraph [ref=e258] [cursor=pointer]:
            - superscript [ref=e259]: "4"
            - text: Yea, though I walk through the valley of the shadow of death, I will fear no evil; For You are with me; Your rod and Your staff, they comfort me.
          - paragraph [ref=e261] [cursor=pointer]:
            - superscript [ref=e262]: "5"
            - text: You prepare a table before me in the presence of my enemies; You anoint my head with oil; My cup runs over.
          - paragraph [ref=e264] [cursor=pointer]:
            - superscript [ref=e265]: "6"
            - text: Surely goodness and mercy shall follow me All the days of my life; And I will dwell in the house of the Lord Forever.
          - generic [ref=e266]:
            - text: NKJV Local Library (BibleTranslations generator) · 6 verses shown
            - generic [ref=e267]: "New King James Version. Generated locally with jadenzaleski/BibleTranslations from privately installed source pages. Copyright/license reference: https://www.biblegateway.com/versions/New-King-James-Version-NKJV-Bible/#copy."
            - generic [ref=e268]:
              - link "BibleHub ↗" [ref=e269] [cursor=pointer]:
                - /url: https://biblehub.com/psalm/23.htm
              - link "Bible.com ↗" [ref=e270] [cursor=pointer]:
                - /url: https://www.bible.com/search/bible?q=Psalm%2023
      - complementary [ref=e271]:
        - button "Expand Chronicle AI" [ref=e272] [cursor=pointer]:
          - generic [ref=e273]: ◀
          - generic [ref=e274]: Chronicle AI
    - contentinfo [ref=e275]:
      - generic [ref=e276]: Primary Scripture display uses the NKJV® (© 1982 Thomas Nelson), with additional licensed sources where available.
      - generic [ref=e277]: Local-first Bible study and spiritual formation.
      - generic [ref=e278]: Chronicle v0.1.0
```

# Test source

```ts
  134 |   await primaryNavItem(page, 'Today').click();
  135 |   await page.getByRole('button', { name: 'Open Discipleship' }).first().click();
  136 |   await expect(page.getByText('Discipleship', { exact: true }).first()).toBeVisible();
  137 |   await page.getByRole('button', { name: 'Pray This Day' }).click();
  138 |   await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  139 |   await expect(page.locator('textarea').first()).toContainText('form me through');
  140 |   await primaryNavItem(page, 'Discipleship').click();
  141 |   await expect(page.getByRole('button', { name: 'Workbook', exact: true })).toBeVisible();
  142 |   await page.getByRole('button', { name: 'Workbook', exact: true }).click();
  143 |   await expect(page.getByText('Workbook Mode')).toBeVisible();
  144 |   const mappedPageLabel = page.getByText(/^Page \d+/, { exact: false }).first();
  145 |   const workbookFallback = page.getByText(/No scanned source pages are available yet for this day/i).first();
  146 |   if (await mappedPageLabel.isVisible().catch(() => false)) {
  147 |     await expect(mappedPageLabel).toBeVisible();
  148 |   } else {
  149 |     await expect(workbookFallback).toBeVisible();
  150 |   }
  151 |   await page.getByRole('button', { name: 'Open Workbook' }).click();
  152 |   await expect(page.getByText('Workbook Mode')).toBeVisible();
  153 | 
  154 |   await page.getByRole('navigation').getByText('Prayer', { exact: true }).click();
  155 |   await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  156 |   await expect(page.locator('#chronicle-agent-mode-select')).toHaveValue('prayer_guide');
  157 |   await expect(page.getByText('Related Chronicle Entries')).toBeVisible();
  158 |   await expect(page.getByText('Recurring Rhythms').last()).toBeVisible();
  159 |   await expect(page.getByText('Save Reflection Prompts')).toBeVisible();
  160 |   await page.getByRole('button', { name: '+ Add Request' }).click();
  161 |   await page.getByPlaceholder('What would you like to bring before God?').fill('Playwright prayer request for app smoke test');
  162 |   await page.getByRole('button', { name: 'Add', exact: true }).click();
  163 |   const prayerRequestCard = page.getByText('Playwright prayer request for app smoke test').locator('xpath=ancestor::div[contains(@style,"box-shadow")][1]');
  164 |   await expect(prayerRequestCard).toBeVisible();
  165 |   await prayerRequestCard.getByRole('button', { name: 'Mark Answered' }).click();
  166 |   await page.getByPlaceholder('Write the answer, provision, clarity, or change Chronicle should remember.').fill('Chronicle captured the answer during the smoke test.');
  167 |   await page.getByPlaceholder('Philippians 4:19').fill('Philippians 4:19');
  168 |   await page.getByRole('button', { name: 'Save Answer' }).click();
  169 |   await expect(page.getByText('Answered Prayers')).toBeVisible();
  170 |   await expect(page.getByText('Chronicle captured the answer during the smoke test.', { exact: true })).toBeVisible();
  171 | 
  172 |   await primaryNavItem(page, 'Chronicle').click();
  173 |   await expect(page.getByText('Answered prayer — Playwright prayer request for app smoke').first()).toBeVisible();
  174 |   await expect(page.getByText('Formation Story')).toBeVisible();
  175 |   await expect(page.getByRole('button', { name: 'Save Prompt Set' }).first()).toBeVisible();
  176 |   const returnToPrayer = page.getByRole('button', { name: 'Return to Prayer' }).first();
  177 |   if (await returnToPrayer.isVisible().catch(() => false)) {
  178 |     await returnToPrayer.click();
  179 |     await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  180 |     await primaryNavItem(page, 'Chronicle').click();
  181 |   }
  182 |   await page.getByRole('button', { name: 'Psalm 23:2' }).click();
  183 |   await expect(page.getByText('Psalm 23').first()).toBeVisible();
  184 |   await primaryNavItem(page, 'Chronicle').click();
  185 |   await page.getByRole('button', { name: 'Legacy View' }).evaluate((element) => element.click());
  186 |   await expect(page.getByText('The Shape of Returning')).toBeVisible();
  187 | 
  188 |   await primaryNavItem(page, 'Themes').click();
  189 |   await expect(page).toHaveURL(/\/themes/);
  190 |   await expect(page.locator('input[placeholder="Find a theme..."]').first()).toBeVisible();
  191 | 
  192 |   await primaryNavItem(page, 'Plans').click();
  193 |   await expect(page.getByText('Active Plan')).toBeVisible();
  194 |   await expect(page.getByText('Strongest Rhythm')).toBeVisible();
  195 | 
  196 |   await primaryNavItem(page, 'Insights').click();
  197 |   await expect(page.getByText('Formation Summary')).toBeVisible();
  198 |   await expect(page.getByText('Prayer Outcomes')).toBeVisible();
  199 |   await expect(page.getByText('Growth Story')).toBeVisible();
  200 | 
  201 |   await primaryNavItem(page, 'Settings').click();
  202 |   await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
  203 |   await expect(page.getByText('Profile', { exact: true }).last()).toBeVisible();
  204 |   await expect(page.getByText('prayer follow-up').first()).toBeVisible();
  205 | 
  206 |   expect(issues, issues.join('\n')).toEqual([]);
  207 | });
  208 | 
  209 | test('chronicle key surfaces stay usable on a phone-width viewport', async ({ page }) => {
  210 |   await page.setViewportSize({ width: 430, height: 932 });
  211 |   await page.goto(appUrl('/'));
  212 | 
  213 |   await expect(page.getByText('Today', { exact: true }).first()).toBeVisible();
  214 |   await expect(page.getByText("Today's Thread")).toBeVisible();
  215 |   await expect(page.getByRole('button', { name: 'Open Chronicle AI' })).toBeVisible();
  216 | 
  217 |   await page.getByRole('navigation').getByText('Prayer', { exact: true }).click();
  218 |   await expect(page.getByText('Pray Now', { exact: true }).last()).toBeVisible();
  219 |   await expect(page.getByText('Follow Up Queue')).toBeVisible();
  220 | 
  221 |   await page.getByRole('navigation').getByText('Study', { exact: true }).click();
  222 |   await expect(page.getByText(/Day 1 ·/)).toBeVisible();
  223 |   await expect(page.getByRole('button', { name: 'Open in Bible' })).toBeVisible();
  224 | 
  225 |   await page.getByRole('navigation').getByText('Bible', { exact: true }).click();
  226 |   const themeOverlayButton = page.getByRole('button', { name: /Theme Overlay/ }).first();
  227 |   const openThemesButton = page.getByRole('button', { name: 'Open Themes' }).first();
  228 |   if (await openThemesButton.isVisible().catch(() => false)) {
  229 |     await expect(openThemesButton).toBeVisible();
  230 |     await openThemesButton.click();
  231 |   } else {
  232 |     await themeOverlayButton.evaluate((element) => element.click());
  233 |   }
> 234 |   await expect(page.getByText('Reading Layer Status')).toBeVisible();
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  235 | 
  236 |   await page.getByRole('navigation').getByText('Settings', { exact: true }).click();
  237 |   await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible();
  238 |   await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
  239 |   await expect(page.getByText('Profile', { exact: true }).last()).toBeVisible();
  240 | });
  241 | 
```