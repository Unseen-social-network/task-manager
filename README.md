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
