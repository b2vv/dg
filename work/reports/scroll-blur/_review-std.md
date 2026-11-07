ДАЛІ: читаю diff main та motionBlur.* для STANDARDS-ревʼю

ФАКТ: прочитав diff main, motionBlur.ts/.test/.contract.test, CODING_STANDARDS §0/§1.
РІШЕННЯ: хард-порушень документованого стандарту немає. Пойнти нижче — judgement.
- motionBlurPx/defaultMotionBlurOptions — чисті, KISS, explicit return, guard NaN/neg ок.
- resolveMotionBlur — null|options, matchMedia read на краю, ок; v1-ліміт задокументовано.
- onMotionBlurFrame/clearMotionBlur — DOM side-effect на краю (дозволено §1), таймер = репо-ідіома (viewportSettleTimer).
- дрібне дублювання filter=''/willChange='' у двох методах; inline-comment у motionBlurPx:29 (no-inline-comments — людський гейт).
DALI: handback.
