build:
	@echo "Installing dependencies"
	yarn install

	@echo "Building React project"
	yarn build

setup:
	@echo "Fetching latest project"
	git pull

	@echo "Installing dependencies"
	yarn install

	@echo "Building React project"
	rm -rf build
	yarn build

	@echo "Copying files to captive portal directory"
	sudo rm -rf /etc/nodogsplash/htdocs
	sudo cp -r build /etc/nodogsplash/htdocs

reset:
	@echo "Reset git repository"
	git reset --hard

	@echo "Removing build directory"
	rm -rf build

	@echo "Removing node_modules directory"
	rm -rf node_modules
