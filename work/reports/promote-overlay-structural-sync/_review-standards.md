ДАЛІ: беру дифф (main vs working tree) по packages/sdk + docs/USAGE.md, читаю новий contract-тест, читаю стандарти-мірники.

ФАКТ: дифф прочитано повністю; sync()/onCameraChange прочитано; CODING_STANDARDS §0 ієрархія прочитана.
РІШЕННЯ: хард-порушень документованих стандартів немає. Диспетчер — не Repeated Switch (одна точка, бінарний union, обидва значення вжиті). Дефолт 'structural' — safe default, задокументовано. Коментарі пояснюють «чому». Тип PromoteSyncReason у стилі PromoteMode.
