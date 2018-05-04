changelog:
	@echo "==============================================="
	@changelog
	@echo "==============================================="
	@changelog all -m > CHANGELOG.md

npm:
	npm publish

publish: npm changelog
