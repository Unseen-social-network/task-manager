# Planner
[![CI](https://github.com/Unseen-social-network/task-manager/actions/workflows/ci.yml/badge.svg?branch=main)](
https://github.com/Unseen-social-network/task-manager/actions/workflows/ci.yml
)
![CD](https://github.com/Unseen-social-network/task-manager/actions/workflows/cd.yml/badge.svg?event=workflow_run)


## Локальные проверки качества

### Backend

```bash
make lint
make test
```

### Frontend

```bash
make frontend-install
make frontend-check
```

### Полный набор проверок (перед CI)

```bash
make lint
make test
make frontend-check
```

```bash
make all-pre-CI
```

## Telegram-бот: команды и сценарии

### Команда `/help`

Добавлен backend-эндпоинт `/api/v1/telegram/help/`, который возвращает подробную справку для бота. Боту достаточно передать `chat_id`, а текст можно показать пользователю без дополнительных преобразований.

### Как создать задачу через Telegram

1. **Привяжите Telegram к аккаунту**
   * В веб-интерфейсе откройте настройки профиля и нажмите «Подключить Telegram-бота».
   * Перейдите по ссылке на бота и выполните команду `/start <token>`.
2. **Быстрое создание задачи (quick)**
   * Команда для пользователя: `/new Заголовок | Описание`.
   * На стороне бота это соответствует вызову `POST /api/v1/telegram/tasks/quick/` с полями:
     * `chat_id`
     * `title`
     * `description` (опционально)
3. **Подробное создание задачи (full)**
   * Команда для пользователя: `/newfull` (бот может дальше вести диалогом).
   * На стороне бота это соответствует вызову `POST /api/v1/telegram/tasks/full/`.
   * Можно передавать дополнительные поля: `urgency`, `due_date`, `status`, `project_id`, `contact_id`, `contact_freeform`, `tagged_username`.

### Как смотреть задачи через Telegram

1. **Список задач**
   * Команда для пользователя: `/tasks` или `/tasks todo`.
   * На стороне бота: `GET /api/v1/telegram/tasks/` с параметрами:
     * `chat_id` — обязателен
     * `status` — опционально (`todo`, `in_progress`, `done`, `canceled`)
     * `limit` — опционально, по умолчанию 10 (максимум 50)
2. **Просмотр конкретной задачи**
   * Команда для пользователя: `/task <id>`.
   * На стороне бота: `GET /api/v1/telegram/tasks/<id>/?chat_id=<chat_id>`.
3. **Ссылка на задачу в вебе**
   * Backend теперь возвращает `task_url` и шаблон `task_url_template` вида: `https://<frontend>/tasks?task={id}`.
   * Эту ссылку удобно добавлять в ответы бота, чтобы пользователь мог сразу открыть задачу в веб-интерфейсе.
