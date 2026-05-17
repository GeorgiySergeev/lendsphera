# Прогресс по промптам

Отмечайте выполненные шаги: замените `[ ]` на `[x]` в колонке **Готово**.  
Один шаг = один PR (см. [`_conventions.md`](./_conventions.md)).

**Сводка:** 0 / 38 шагов · фазы 0–6

### Phase 0 · Foundations — 0 / 5

| Готово | ID  | Название               | Промпт                                                                           | PR / заметки |
| :----: | --- | ---------------------- | -------------------------------------------------------------------------------- | ------------ |
|  [ ]   | 0.1 | Prisma domain model    | [0.1-prisma-domain-model.md](./phase-0-foundations/0.1-prisma-domain-model.md)   |              |
|  [ ]   | 0.2 | Shared types package   | [0.2-shared-types-package.md](./phase-0-foundations/0.2-shared-types-package.md) |              |
|  [ ]   | 0.3 | OpenAPI and API client | [0.3-openapi-and-client.md](./phase-0-foundations/0.3-openapi-and-client.md)     |              |
|  [ ]   | 0.4 | Auth and RBAC          | [0.4-auth-and-rbac.md](./phase-0-foundations/0.4-auth-and-rbac.md)               |              |
|  [ ]   | 0.5 | Audit log              | [0.5-audit-log.md](./phase-0-foundations/0.5-audit-log.md)                       |              |

### Phase 1 · CRM Inventory — 0 / 5

| Готово | ID  | Название                  | Промпт                                                                                   | PR / заметки |
| :----: | --- | ------------------------- | ---------------------------------------------------------------------------------------- | ------------ |
|  [ ]   | 1.1 | Products API              | [1.1-products-api.md](./phase-1-inventory/1.1-products-api.md)                           |              |
|  [ ]   | 1.2 | Geos + Prices API         | [1.2-geos-and-prices-api.md](./phase-1-inventory/1.2-geos-and-prices-api.md)             |              |
|  [ ]   | 1.3 | Landings API              | [1.3-landings-api.md](./phase-1-inventory/1.3-landings-api.md)                           |              |
|  [ ]   | 1.4 | Legacy inventory importer | [1.4-legacy-inventory-importer.md](./phase-1-inventory/1.4-legacy-inventory-importer.md) |              |
|  [ ]   | 1.5 | Read-only CRM UI          | [1.5-readonly-crm-ui.md](./phase-1-inventory/1.5-readonly-crm-ui.md)                     |              |

### Phase 2 · Legacy Bridge — 0 / 6

| Готово | ID  | Название                           | Промпт                                                                               | PR / заметки |
| :----: | --- | ---------------------------------- | ------------------------------------------------------------------------------------ | ------------ |
|  [ ]   | 2.1 | runtime-vars endpoint              | [2.1-runtime-vars-endpoint.md](./phase-2-legacy-bridge/2.1-runtime-vars-endpoint.md) |              |
|  [ ]   | 2.2 | PHP bridge package                 | [2.2-php-bridge-package.md](./phase-2-legacy-bridge/2.2-php-bridge-package.md)       |              |
|  [ ]   | 2.3 | Placeholder migration script       | [2.3-placeholder-migration.md](./phase-2-legacy-bridge/2.3-placeholder-migration.md) |              |
|  [ ]   | 2.4 | nginx auto_prepend integration     | [2.4-nginx-auto-prepend.md](./phase-2-legacy-bridge/2.4-nginx-auto-prepend.md)       |              |
|  [ ]   | 2.5 | Cache invalidation on price change | [2.5-cache-invalidation.md](./phase-2-legacy-bridge/2.5-cache-invalidation.md)       |              |
|  [ ]   | 2.6 | E2E: CRM price → legacy page       | [2.6-e2e-price-propagation.md](./phase-2-legacy-bridge/2.6-e2e-price-propagation.md) |              |

### Phase 3 · Widgets & Native Runtime — 0 / 6

| Готово | ID  | Название                         | Промпт                                                                                             | PR / заметки |
| :----: | --- | -------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
|  [ ]   | 3.1 | Widget contract and core widgets | [3.1-widget-contract.md](./phase-3-widgets-runtime/3.1-widget-contract.md)                         |              |
|  [ ]   | 3.2 | Storybook + visual regression    | [3.2-storybook-visual-regression.md](./phase-3-widgets-runtime/3.2-storybook-visual-regression.md) |              |
|  [ ]   | 3.3 | LandingContextResolver (full)    | [3.3-landing-context-resolver.md](./phase-3-widgets-runtime/3.3-landing-context-resolver.md)       |              |
|  [ ]   | 3.4 | Runtime dynamic route            | [3.4-runtime-dynamic-route.md](./phase-3-widgets-runtime/3.4-runtime-dynamic-route.md)             |              |
|  [ ]   | 3.5 | ISR + on-publish revalidation    | [3.5-isr-revalidation.md](./phase-3-widgets-runtime/3.5-isr-revalidation.md)                       |              |
|  [ ]   | 3.6 | Lead form forwarding             | [3.6-lead-form-forwarding.md](./phase-3-widgets-runtime/3.6-lead-form-forwarding.md)               |              |

### Phase 4 · CRM Editor & Publishing — 0 / 6

| Готово | ID  | Название                      | Промпт                                                                                         | PR / заметки |
| :----: | --- | ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------ |
|  [ ]   | 4.1 | Landing editor                | [4.1-landing-editor.md](./phase-4-editor-publishing/4.1-landing-editor.md)                     |              |
|  [ ]   | 4.2 | Versioning & diff viewer      | [4.2-versioning-diff.md](./phase-4-editor-publishing/4.2-versioning-diff.md)                   |              |
|  [ ]   | 4.3 | Preview flow                  | [4.3-preview-flow.md](./phase-4-editor-publishing/4.3-preview-flow.md)                         |              |
|  [ ]   | 4.4 | Approve / publish workflow    | [4.4-approve-publish-workflow.md](./phase-4-editor-publishing/4.4-approve-publish-workflow.md) |              |
|  [ ]   | 4.5 | Pricing matrix UI             | [4.5-pricing-matrix.md](./phase-4-editor-publishing/4.5-pricing-matrix.md)                     |              |
|  [ ]   | 4.6 | Landings bulk operations grid | [4.6-landings-bulk-grid.md](./phase-4-editor-publishing/4.6-landings-bulk-grid.md)             |              |

### Phase 5 · Legacy Importer — 0 / 5

| Готово | ID  | Название                    | Промпт                                                                           | PR / заметки |
| :----: | --- | --------------------------- | -------------------------------------------------------------------------------- | ------------ |
|  [ ]   | 5.1 | Legacy HTML parser          | [5.1-html-parser.md](./phase-5-legacy-importer/5.1-html-parser.md)               |              |
|  [ ]   | 5.2 | Block detection heuristics  | [5.2-block-detection.md](./phase-5-legacy-importer/5.2-block-detection.md)       |              |
|  [ ]   | 5.3 | LLM-assisted widget mapping | [5.3-llm-widget-mapping.md](./phase-5-legacy-importer/5.3-llm-widget-mapping.md) |              |
|  [ ]   | 5.4 | Asset uploader              | [5.4-asset-uploader.md](./phase-5-legacy-importer/5.4-asset-uploader.md)         |              |
|  [ ]   | 5.5 | Promote to NATIVE           | [5.5-promote-to-native.md](./phase-5-legacy-importer/5.5-promote-to-native.md)   |              |

### Phase 6 · i18n & AI — 0 / 5

| Готово | ID  | Название                 | Промпт                                                                               | PR / заметки |
| :----: | --- | ------------------------ | ------------------------------------------------------------------------------------ | ------------ |
|  [ ]   | 6.1 | I18n editor              | [6.1-i18n-editor.md](./phase-6-i18n-ai/6.1-i18n-editor.md)                           |              |
|  [ ]   | 6.2 | LLM provider abstraction | [6.2-llm-provider-abstraction.md](./phase-6-i18n-ai/6.2-llm-provider-abstraction.md) |              |
|  [ ]   | 6.3 | Translation queue        | [6.3-translation-queue.md](./phase-6-i18n-ai/6.3-translation-queue.md)               |              |
|  [ ]   | 6.4 | Human review UI          | [6.4-human-review-ui.md](./phase-6-i18n-ai/6.4-human-review-ui.md)                   |              |
|  [ ]   | 6.5 | Compliance sweeper       | [6.5-compliance-sweeper.md](./phase-6-i18n-ai/6.5-compliance-sweeper.md)             |              |

---

## Критерии выхода по фазам

| Фаза | Критерий (из [README.md](./README.md))                                         |
| ---: | ------------------------------------------------------------------------------ |
|    0 | Prisma migrated, OpenAPI + TS client, Auth working, AuditLog on every mutation |
|    1 | Legacy folders ingested as `Landing` rows, visible in `apps/web`               |
|    2 | Price edit in CRM updates PHP landing within 30 s                              |
|    3 | One landing from DB in `apps/runtime`, visual parity with legacy               |
|    4 | Marketers build / version / publish / bulk-edit from `apps/web`                |
|    5 | One-click WRAPPED → NATIVE via parser + LLM                                    |
|    6 | New i18n key fans out to N locales via review queue                            |

## Сводная таблица по фазам

|  Фаза | Тема                | Шагов  | Готово | %      |
| ----: | ------------------- | :----: | :----: | ------ |
|     0 | Foundations         |   5    |   0    | 0%     |
|     1 | CRM Inventory       |   5    |   0    | 0%     |
|     2 | Legacy Bridge       |   6    |   0    | 0%     |
|     3 | Widgets & Runtime   |   6    |   0    | 0%     |
|     4 | Editor & Publishing |   6    |   0    | 0%     |
|     5 | Legacy Importer     |   5    |   0    | 0%     |
|     6 | i18n & AI           |   5    |   0    | 0%     |
| **Σ** |                     | **38** | **0**  | **0%** |
