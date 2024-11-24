# Variables
LINT_TIMEOUT = 10m
NODE_MODULES = ./node_modules
ESLINT = $(NODE_MODULES)/.bin/eslint
PRETTIER = $(NODE_MODULES)/.bin/prettier
TS = $(NODE_MODULES)/.bin/tsc
JEST = $(NODE_MODULES)/.bin/jest

.PHONY: install
install:
	@echo "Installing dependencies..."
	npm install

.PHONY: lint
lint: install
	@echo "Running ESLint with timeout $(LINT_TIMEOUT)..."
	$(ESLINT) 'src/**/*.ts' --max-warnings=0 --timeout $(LINT_TIMEOUT)

.PHONY: format
format: install
	@echo "Running Prettier to format code..."
	$(PRETTIER) --write 'src/**/*.ts'

.PHONY: build
build: install
	@echo "Building TypeScript project..."
	$(TS)

.PHONY: test
test: install
	@echo "Running tests with Jest..."
	$(JEST)

.PHONY: clean
clean:
	@echo "Cleaning up build artifacts..."
	rm -rf dist

.PHONY: dev
dev: install
	@echo "Starting development server..."
	npx ts-node-dev src/index.ts

.PHONY: lint-fix
lint-fix: install
	@echo "Running ESLint with auto-fix..."
	$(ESLINT) 'src/**/*.ts' --fix

.PHONY: all
all: clean format lint build test
	@echo "All tasks completed successfully!"
