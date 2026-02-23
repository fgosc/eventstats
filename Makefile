.PHONY: fmt
fmt:
	ruff format lambda/

.PHONY: lint
lint:
	ruff check lambda/

.PHONY: gen-priority-file
gen-priority-file:
	./gen_item_list_priority.py -i ../fgoscdata/hash_drop.json -o viewer/src/data/item_list_priority.json
