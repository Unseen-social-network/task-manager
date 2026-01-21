# Planner

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

