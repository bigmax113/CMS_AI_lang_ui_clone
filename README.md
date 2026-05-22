# CMS AI

CMS AI - это продуктовый прототип на базе Payload Admin и отдельного AI Workbench. Его смысл не в конкретном AI-провайдере, а в рабочем процессе: загрузить документы, проверить ответы по источникам, оформить контент, управлять блогом и связать материалы между несколькими сайтами.

## Что решает продукт

Система объединяет две рабочие зоны:

- **Payload Admin** - место, где хранятся управляемые данные: статьи, блог, сайты, шаблоны, ссылки, документы, тестовые прогоны.
- **AI Workbench** - рабочая зона для проверки документов, просмотра корпуса источников, генерации медиа-черновиков и быстрого перехода к админке.

Главная логика: AI не существует отдельно от CMS. Он помогает работать с теми же документами, шаблонами, сайтами и ссылками, которые редактор видит в админке.

## Основные сценарии

### 1. Проверка документов через RAG

1. Редактор или тестировщик открывает **Admin -> Media**.
2. Загружает PDF, TXT, Markdown, DOCX, XLIFF или XML.
3. Открывает **AI Workbench -> Corpus**.
4. Нажимает **Refresh** и видит загруженные файлы в группе **Uploaded media**.
5. Переходит в **Ask**, выбирает область поиска, нажимает **Preview sources**.
6. Если источники релевантны, нажимает **Ask**.
7. Результат можно сохранить в **Test Runs** как проверочный прогон.

### 2. Контролируемая проверка AI-ответов

AI Workbench сделан не как чат ради чата. В нем есть порядок:

- сначала выбрать область поиска;
- затем посмотреть источники;
- затем получить ответ;
- затем сохранить результат проверки, источники и оценку.

Так команда может показать заказчику не только ответ, но и доказательство: какие файлы использовались, какие фрагменты были найдены и как результат был оценен.

### 3. Подготовка блог-контента

1. В **Sites** описываются сайты, для которых создается контент.
2. В **Blog Templates** задаются типовые структуры статей, SEO-правила и правила перелинковки.
3. В **Blog Posts** редактор создает конкретный пост.
4. В посте выбирается сайт, шаблон, related content и link plan.
5. Вкладка **AI Brief** хранит задачу для AI-assisted черновика.

### 4. Управляемая перелинковка между сайтами

**Site Links** хранит не просто URL. Запись описывает:

- с какого сайта и материала идет переход;
- на какой сайт или материал ведем;
- какой anchor text или CTA показываем;
- где ссылка должна появиться;
- нужен ли мягкий transition screen;
- какой риск или rationale у ссылки.

Это позволяет управлять переходами между сайтами как контентной системой, а не набором случайных ссылок.

### 5. Медиа-черновики

В **AI Workbench -> Generate** можно подготовить черновик изображения или видео для статьи, блога, презентации или маркетингового блока. Результат затем можно сохранить как CMS asset в **Media**.

## Как связаны Admin и AI Workbench

Связь двусторонняя.

Из AI Workbench в админку:

- кнопка **Open Payload Admin** ведет в Payload Admin;
- вкладка **Admin** показывает быстрые ссылки на ключевые коллекции;
- результаты проверок можно переносить в **Test Runs**.

Из админки в AI Workbench:

- dashboard содержит кнопку **Open AI Workbench**;
- dashboard содержит кнопку **Upload RAG documents**;
- коллекция **Media** стала точкой загрузки документов для RAG;
- загруженные файлы становятся видимыми в **Corpus**.

## Публичные frontend-страницы

Статус **Published** теперь не только помечает запись в админке, но и делает ее доступной на frontend.

Ссылки:

- список статей: `/articles`
- статья: `/articles/{articleSlug}`
- список постов: `/blog`
- короткий URL поста: `/blog/{postSlug}`
- URL поста с учетом сайта: `/sites/{siteSlug}{defaultBlogPath}/{postSlug}`

Например, если у сайта `slug = demo-site`, `defaultBlogPath = /blog`, а у поста `slug = launch-guide`, публичный URL будет:

```text
/sites/demo-site/blog/launch-guide
```

Внутри админки у **Articles** и **Blog Posts** добавлено read-only поле **Public URL** в sidebar. Также для опубликованных записей работает preview-ссылка из edit view.

## Карта данных

```text
Media
  -> AI Workbench Corpus
  -> Ask / RAG answers

AI Projects
  -> Test Runs

Prompt Templates
  -> Test Runs
  -> manual reuse in Ask

Sites
  -> Blog Posts
  -> Site Links

Blog Templates
  -> Blog Posts

Articles
  -> Blog Posts.relatedArticles
  -> Site Links.sourceContent / targetContent

Blog Posts
  -> Blog Posts.relatedPosts
  -> Site Links.sourceContent / targetContent
  -> Site Links through linkPlan
```

## AI Workbench

### Ask

Экран для вопросов к документам.

| Поле или контроль | Для чего нужно | Как связано с системой |
| --- | --- | --- |
| Question | Вопрос тестировщика или редактора. | Используется для поиска релевантных документов и формирования ответа. |
| Folder | Ограничивает поиск конкретной группой источников. | Берется из Corpus: seed docs или Uploaded media. |
| Name/path filter | Фильтрует документы по части имени или пути. | Помогает быстро проверить конкретный файл или папку. |
| Answer in question language | Просит отвечать на языке вопроса. | Удобно для многоязычных документов и сайтов. |
| Cross-language search | Расширяет поиск по смыслу между языками. | Помогает, если вопрос на одном языке, а документы на другом. |
| Include PDFs | Включает PDF в поиск. | PDF могут быть тяжелее для извлечения, поэтому контроль вынесен отдельно. |
| Use semantic reranking | Дополнительное смысловое ранжирование найденных фрагментов. | Используется как улучшение качества поиска, если настроена embedding-модель. |
| Files | Максимум документов, которые можно просканировать. | Защищает тест от слишком широкого поиска. |
| Chunks | Максимум фрагментов, которые попадут в ответ. | Управляет размером контекста для AI. |
| Preview sources | Показывает источники без генерации ответа. | Главный контроль доверия перед Ask. |
| Ask | Генерирует ответ по выбранным источникам. | Результат можно перенести в Test Runs. |

### Generate

Экран для медиа-черновиков.

| Поле или контроль | Для чего нужно | Как связано с системой |
| --- | --- | --- |
| Image prompt | Описание изображения. | Используется для hero, blog cover, иллюстраций и презентаций. |
| Aspect ratio | Формат изображения. | Помогает готовить asset под конкретное место в CMS. |
| Generate image | Создает черновик изображения. | Результат можно загрузить в Media. |
| Video prompt | Описание видео. | Используется для коротких промо- или demo-роликов. |
| Optional source image URL | Картинка-референс для видео. | Связывает видео с уже созданным визуалом. |
| Duration seconds | Длительность ролика. | Помогает контролировать формат результата. |
| Generate video | Создает video request и возвращает результат или request ID. | Результат можно использовать как внешний media asset. |

### Corpus

Экран показывает, какие документы доступны для RAG.

| Элемент | Для чего нужен | Как связано с системой |
| --- | --- | --- |
| Documents | Общее число найденных файлов. | Считает файлы из seed docs и Media uploads. |
| Folders | Группы источников. | Используются в поле Folder на вкладке Ask. |
| Source roots | Показывает реальные корни источников. | Помогает понять, откуда AI берет документы. |
| Upload RAG documents | Переход в Media. | Делает загрузку документов частью админки. |
| File list | Список файлов, расширений и размеров. | Позволяет проверить, что нужный файл попал в корпус. |

### Admin

Вкладка быстрых переходов из AI Workbench в Payload Admin. Нужна, чтобы пользователь не ощущал AI и CMS как две разные системы.

## Payload Admin Dashboard

Dashboard - первый экран админки. Он выполняет роль control room:

- показывает, что это рабочая зона Payload AI;
- дает быстрый вход в AI Workbench;
- дает быстрый вход в Media для RAG-документов;
- открывает ключевые коллекции без поиска по боковому меню.

Ключевые ссылки:

- **AI Workbench** - перейти к вопросам, corpus, генерации и AI-интерфейсу.
- **RAG Documents** - загрузить документы в Media.
- **AI Projects** - описать цель проверки.
- **Prompt Templates** - хранить повторяемые инструкции.
- **Test Runs** - сохранять результаты проверок.
- **Blog Posts** - управлять блоговыми материалами.
- **Site Links** - управлять переходами между сайтами.
- **Sites** - хранить карту сайтов.

## Коллекции Payload Admin

### AI Projects

Группа: **AI Workbench**.

AI Project описывает цель проверки или рабочей зоны. Это не технический проект разработки, а бизнес-контейнер для тестов: что проверяем, кто владелец, какие критерии успеха.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| name | Название проекта или проверки. | Используется как заголовок записи и ссылка из Test Runs. |
| status | Planning, Testing, Ready или Paused. | Показывает готовность проверки. |
| owner | Команда или человек, отвечающий за результат. | Помогает назначить ответственность. |
| goal | Что тестировщик должен доказать. | Главная бизнес-цель для AI Workbench. |
| docsFolder | Рекомендуемая папка источников. | Подсказывает, какой scope выбирать в Ask. |
| defaultModel | Служебная настройка модели по умолчанию. | Не определяет продуктовую логику; провайдер может быть заменен. |
| successCriteria | Список критериев успеха. | Используется при оценке Test Runs. |
| notes | Внутренние заметки. | Хранит контекст для редактора или тестировщика. |

### Prompt Templates

Группа: **AI Workbench**.

Prompt Template хранит повторяемые инструкции. Смысл коллекции - убрать хаос из промптов и сделать лучшие сценарии переиспользуемыми.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| title | Название шаблона. | Используется в списках и Test Runs. |
| isEnabled | Включен ли шаблон. | Позволяет архивировать плохие или устаревшие промпты без удаления. |
| mode | QA, Summary, Audit или Content draft. | Разделяет назначение шаблонов. |
| systemPrompt | Стабильное поведение AI: роль, язык, работа с источниками. | Формирует правила ответа. |
| userPrompt | Повторяемый текст запроса. | Можно копировать в Ask или использовать как основу автоматизации. |
| maxChunks | Сколько фрагментов источников желательно использовать. | Соответствует контролю Chunks в Ask. |
| temperature | Насколько вариативным должен быть ответ. | Служебная настройка генерации. |
| tags | Темы или области применения. | Упрощают поиск шаблонов. |

### Test Runs

Группа: **AI Workbench**.

Test Run - журнал проверки. Он нужен, чтобы фиксировать не только итоговый ответ, но и вопрос, источники, оценку и review notes.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| title | Название проверки. | Отображается в списке Test Runs. |
| project | К какому AI Project относится проверка. | Связывает результат с целью. |
| promptTemplate | Какой шаблон использовался. | Помогает повторить или улучшить тест. |
| status | New, Passed, Needs review или Failed. | Показывает результат проверки. |
| rating | Good, Okay или Bad. | Быстрая качественная оценка ответа. |
| ranAt | Дата и время проверки. | Нужна для аудита и истории. |
| question | Вопрос, который задавали. | Берется из Ask или вводится вручную. |
| answer | Ответ AI. | Сохраняется для review. |
| sources.fileName | Имя использованного файла. | Соответствует источникам из Preview sources. |
| sources.path | Путь к файлу. | Помогает найти документ в Corpus. |
| sources.score | Оценка релевантности. | Показывает, почему источник был выбран. |
| reviewNotes | Заметки редактора или тестировщика. | Используется для выводов и доработок. |

### Sites

Группа: **CMS**.

Sites описывает управляемые сайты. Эта коллекция нужна для мультисайтового контента и cross-site переходов.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| name | Человеческое название сайта. | Используется в Blog Posts и Site Links. |
| slug | Стабильный ключ сайта. | Нужен для шаблонов, ссылок и внутренних правил. |
| status | Draft, Live, Paused или Archived. | Показывает состояние сайта. |
| primaryDomain | Канонический домен. | Используется для маршрутов и target URL. |
| locale | Язык сайта. | Важен для локализации и language-switch ссылок. |
| siteRole | Corporate, content hub, store, support или regional. | Помогает понять назначение сайта при линковке. |
| defaultBlogPath | Базовый путь блога. | Используется в Blog Posts для URL-логики. |
| owner | Ответственный за сайт. | Организационная связь. |
| notes | Ограничения, зависимости, правила. | Помогает редакторам учитывать контекст сайта. |

### Blog Templates

Группа: **CMS**.

Blog Template - это шаблон статьи до написания текста. Он описывает структуру, SEO, перелинковку и AI-подсказки.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| title | Название шаблона. | Выбирается в Blog Posts. |
| key | Уникальный ключ шаблона. | Нужен для повторяемых сценариев и автоматизации. |
| status | Draft, Active или Archived. | Позволяет включать только актуальные шаблоны. |
| templateType | Guide, News, Case study, Comparison, Release note, SEO cluster. | Определяет формат материала. |
| editorialGoal | Что помогает создать шаблон. | Объясняет назначение редактору. |
| titlePattern | Формула заголовка. | Используется при планировании Blog Posts. |
| summaryPattern | Формула summary. | Помогает создавать карточки и previews. |
| structure.sectionTitle | Название секции. | Формирует план статьи. |
| structure.sectionRole | Intro, Body, Proof, CTA, FAQ, Related links. | Задает роль блока в тексте. |
| structure.instructions | Что должно быть в секции. | Используется редактором или AI-assisted drafting. |
| structure.isRequired | Обязательна ли секция. | Помогает контролировать полноту статьи. |
| requiredInternalLinks | Минимум внутренних ссылок. | Связано с Blog Posts.relatedArticles/relatedPosts. |
| requiredCrossSiteLinks | Минимум ссылок на другие сайты. | Связано с Site Links. |
| anchorTextGuidance | Правила anchor text. | Используется при создании Site Links. |
| relatedContentStrategy | Как связывать материалы. | Помогает строить link plan. |
| aiPrompts.briefPrompt | Как собрать brief. | Используется для AI Brief. |
| aiPrompts.outlinePrompt | Как собрать outline. | Используется при черновике статьи. |
| aiPrompts.linkingPrompt | Как предложить ссылки. | Связано с Site Links и linkPlan. |
| seo.metaTitlePattern | Формула SEO title. | Используется в Blog Posts SEO. |
| seo.metaDescriptionPattern | Формула SEO description. | Используется в Blog Posts SEO. |
| seo.keywordGuidance | Подсказки по ключевым словам. | Связано с AI Brief targetKeywords. |

### Blog Posts

Группа: **CMS**.

Blog Post - конкретная блоговая публикация. Она связывает сайт, шаблон, контент, AI brief, SEO и link plan.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| title | Заголовок поста. | Используется в админке и публикации. |
| slug | URL-сегмент поста. | Работает вместе с Sites.defaultBlogPath. |
| status | Idea, Draft, In review, Scheduled или Published. | Управляет редакционным состоянием. |
| site | Сайт публикации. | Relationship к Sites. |
| template | Шаблон поста. | Relationship к Blog Templates. |
| publishedAt | Дата публикации. | Используется при scheduled/published workflow. |
| summary | Короткое описание. | Для карточек, previews и AI source summaries. |
| coverImage | Обложка. | Upload из Media. |
| content | Основной rich text. | Поддерживает reusable cross-site CTA block. |
| category | Тип материала. | Buying guide, product education, news, case study, knowledge base. |
| audience | Для кого материал. | Customer, partner, internal editor или support. |
| owner | Ответственный редактор. | Организационная связь. |
| tags | Темы материала. | Поиск, фильтрация, планирование. |
| canonicalURL | Канонический URL. | Нужен при синдикации. |
| relatedArticles | Связанные статьи. | Relationship к Articles. |
| relatedPosts | Связанные посты. | Relationship к Blog Posts. |
| linkPlan | Утвержденные или предложенные ссылки. | Relationship к Site Links. |
| aiAssist.brief | Бизнес-бриф для черновика. | Используется AI-assisted workflow. |
| aiAssist.targetKeywords | Целевые ключевые слова. | Связано с SEO и шаблоном. |
| aiAssist.questionsToAnswer | Вопросы, которые должен закрыть пост. | Помогают контролировать полноту. |
| aiAssist.linkingNotes | Где и зачем ставить ссылки. | Связано с Site Links. |
| seo.title | SEO title. | Может использовать Blog Template pattern. |
| seo.description | SEO description. | Может использовать Blog Template pattern. |
| seo.image | SEO image. | Upload из Media. |

В Blog Posts включены drafts и autosave. Это значит, что редактор может безопасно работать с черновиками и возвращаться к версиям.

### Site Links

Группа: **CMS**.

Site Link - управляемая запись перехода. Она нужна для внутренних ссылок, CTA, переходных страниц, language switch и cross-site handoff.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| title | Название ссылки или перехода. | Отображается в списке и linkPlan. |
| status | Proposed, Approved, Live, Needs review или Archived. | Управляет готовностью ссылки. |
| linkType | Contextual, Navigation, CTA, Redirect, Language switch, Campaign transition. | Определяет назначение ссылки. |
| sourceSite | Откуда ведем. | Relationship к Sites. |
| targetSite | Куда ведем. | Relationship к Sites. |
| sourcePath | URL path источника, если нет CMS-документа. | Альтернатива sourceContent. |
| sourceContent | CMS-документ, где ссылка должна появиться. | Relationship к Articles или Blog Posts. |
| targetURL | Финальный URL. | Используется для внешних или точных destination. |
| targetContent | CMS-документ назначения. | Relationship к Articles или Blog Posts. |
| anchorText | Видимый текст ссылки или CTA. | Используется в публикации и transition blocks. |
| placement | Body, header, footer, related, blog-card или transition-page. | Объясняет, где показывать ссылку. |
| priority | Порядок вывода. | Низкое число показывается раньше. |
| editorNotes | Заметки редактора. | Контекст для ревью. |
| transitionTemplate.mode | Direct, soft handoff, campaign bridge, language selector, product bridge. | Определяет тип перехода. |
| transitionTemplate.headline | Заголовок transition screen. | Используется, если нужен мягкий переход. |
| transitionTemplate.description | Пояснение перехода. | Помогает пользователю понять смену сайта. |
| transitionTemplate.ctaLabel | Текст кнопки. | По умолчанию Continue. |
| transitionTemplate.preserveQueryParams | Сохранять tracking/campaign параметры. | Важно для маркетинга и аналитики. |
| aiReview.rationale | Почему ссылка полезна. | AI/editor explanation. |
| aiReview.risk | Low, Medium или High. | Контроль качества и риска. |
| aiReview.suggestedBy | Кто предложил ссылку. | Может быть editor, seed или AI workflow. |

### Articles

Группа: **CMS**.

Articles - базовая библиотека контента: knowledge base, release notes, internal guides и product content.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| title | Заголовок статьи. | Используется в related content и Site Links. |
| slug | URL-сегмент статьи. | Нужен для публикации и ссылок. |
| status | Draft, In review или Published. | Редакционное состояние. |
| publishedAt | Дата публикации. | История и сортировка. |
| summary | Короткое описание. | Карточки, previews, AI source context. |
| coverImage | Обложка статьи. | Upload из Media. |
| content | Rich text с headings, lists, links, uploads, tables, callouts и code blocks. | Основной контент. |
| category | Product content, internal guide, release note, knowledge base. | Помогает классифицировать статьи. |
| tags | Темы. | Поиск и фильтрация. |
| owner | Ответственный. | Организационная связь. |
| seo.title | SEO title. | Для поисковой выдачи. |
| seo.description | SEO description. | Для поисковой выдачи. |
| seo.image | SEO image. | Upload из Media. |

Articles могут быть связаны с Blog Posts как relatedArticles и с Site Links как sourceContent или targetContent.

### Media

Группа: **Library**.

Media - общая библиотека файлов. Сейчас она выполняет две роли:

- хранит изображения и SEO/media assets;
- принимает документы для RAG-тестов.

| Поле | Для чего нужно | Связи |
| --- | --- | --- |
| file upload | Сам файл. | Используется Articles, Blog Posts, SEO images и AI Workbench Corpus. |
| alt | Короткое описание. | Для доступности изображений и описания RAG-документов. |
| caption | Редакторская заметка. | Для RAG можно описать назначение документа. |
| tags | Темы или группы. | Помогают искать файлы. |

Поддерживаемые RAG-форматы: PDF, TXT, Markdown, DOCX, XLIFF, XML.

### Users

Users - стандартная auth-коллекция Payload. Сейчас используется для входа в админку. Основное поле - email, пароль управляется auth-механикой Payload.

## Практический demo script

1. Открыть `/admin`.
2. На dashboard показать кнопки **Open AI Workbench** и **Upload RAG documents**.
3. Открыть **Media**, загрузить тестовый PDF или DOCX.
4. Открыть `/ai`, перейти в **Corpus**, нажать **Refresh**.
5. Показать группу **Uploaded media**.
6. Перейти в **Ask**, нажать **Preview sources**.
7. Показать найденные файлы и фрагменты.
8. Нажать **Ask** и получить ответ.
9. Открыть **Test Runs** и объяснить, где сохраняется вопрос, ответ, источники и оценка.
10. Открыть **Sites**, **Blog Templates**, **Blog Posts** и **Site Links**.
11. Показать, как пост связан с сайтом, шаблоном, related content и link plan.
12. Завершить объяснением end-to-end цикла: documents -> QA -> content -> links -> managed sites.

## Презентация и мануал

- HTML-мануал: `public/manual/index.html`
- HTML README по функционалу: `public/manual/readme.html`
- Продуктовая PPT-презентация: `public/manual/CMS_AI_presentation_ru.pptx`
- PNG-превью слайдов: `public/manual/ppt-preview`

## Техническая заметка

AI-провайдер и конкретные модели являются заменяемой инфраструктурной частью. Продуктовая ценность находится выше этого слоя: структура данных, workflow проверки, RAG-источники, шаблоны, блог, сайты и управляемая перелинковка.

На Render free локальные загрузки подходят для прототипа и RAG-теста, но могут исчезнуть после restart или redeploy. Для production-хранения нужен постоянный storage: Render Disk, S3 или аналог.

## Локальный запуск для проверки

```powershell
Copy-Item .env.example .env
corepack pnpm install
corepack pnpm dev
```

Адреса:

```text
http://localhost:3000/ai
http://localhost:3000/admin
http://localhost:3000/manual
```

Docker:

```powershell
docker compose up --build
```
