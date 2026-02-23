.PHONY: fmt
fmt:
	ruff format lambda/

.PHONY: lint
lint:
	ruff check lambda/
