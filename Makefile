SHELL := /bin/bash

.PHONY: help install test

help: ## Show available commands
	@echo ""
	@echo "Obs-Dailynotes - Amplifier Tools"
	@echo "================================="
	@echo ""
	@echo "Setup:"
	@echo "  make amplifier-setup    Set up amplifier tools environment"
	@echo ""
	@echo "Amplifier Tools:"
	@echo "  make generate-person EMAIL=<email>   Generate enriched person page"
	@echo ""
	@echo "Standard Commands:"
	@echo "  make install           Install dependencies (pnpm)"
	@echo "  make test             Run all tests"
	@echo ""

install: ## Install dependencies
	pnpm install

test: ## Run tests
	python run_tests.py all

# Amplifier Tools

.PHONY: amplifier-setup generate-person

amplifier-setup: ## Set up amplifier tools Python environment
	python3 -m venv .venv-amplifier
	. .venv-amplifier/bin/activate && pip install -r amplifier-tools/requirements.txt
	@echo "✅ Amplifier tools environment ready"
	@echo "💡 Add ANTHROPIC_API_KEY to your .env file"

generate-person: ## Generate enriched person page (usage: make generate-person EMAIL=someone@example.com)
ifndef EMAIL
	@echo "❌ Error: EMAIL not specified"
	@echo "Usage: make generate-person EMAIL=someone@example.com"
	@echo "   or: make generate-person EMAIL=person@example.com NAME=\"Person Name\""
	@exit 1
endif
	@. .venv-amplifier/bin/activate && python3 amplifier-tools/generate_person_page.py "$(EMAIL)" $(if $(NAME),--name "$(NAME)")
