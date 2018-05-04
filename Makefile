changelog:
	@echo "==============================================="
	@changelog
	@echo "==============================================="
	@changelog all -m > CHANGELOG.md

publish:
	npm publish
	make changelog
