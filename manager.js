/*
    Files

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

import * as common from "./common.js";
import * as files from "./script.js";
import * as fs from "./fs.js";
import * as localFsProvider from "./providers/local.js";

var sizeUnits = await import(`${common.AUI_URL_PREFIX}/src/sizeunits.js`);
var astronaut = await import(`${common.AUI_URL_PREFIX}/astronaut/astronaut.js`);
var listViews = await import(`${common.AUI_URL_PREFIX}/astronaut/assemblies/listviews/listviews.js`);

window.astronaut = astronaut;

var viewOptions = {
    sortBy: "name",
    sortOrder: "ascending",
    showProps: ["name", "type", "size", "lastModified"],
    showFoldersFirst: true,
    showFileExtensions: false,
    showHiddenFiles: false
};

var SkeletonTableHeaderCell = astronaut.component("SkeletonTableHeaderCell", function(props, children) {
    return TableHeaderCell({
        styles: {
            "width": props.width || "100%"
        }
    }) (
        TextFragment({
            attributes: {
                "aui-skeletontext": true
            },
            styles: {
                "width": "100%"
            }
        }) ()
    );
});

export var ProviderPage = astronaut.component("ProviderPage", function(props, children, inter) {
    var backJourney = [];

    var page = Page() (
        Section (
            Heading() (props.provider.name)
        )
    );

    inter.render = async function() {
        var entryDisplayName = props.provider.entryName ?? props.provider.name;

        // Create skeleton loader

        page.clear().add(
            Section({mode: "wide"}) (
                Heading(1) (entryDisplayName),
                SkeletonLoader({alt: _("loadingEntries")}) (
                    Table({
                        styles: {
                            "width": "100%"
                        }
                    }) (
                        TableHeader (
                            TableRow (
                                SkeletonTableHeaderCell({width: "55%"}) (),
                                SkeletonTableHeaderCell({width: "15%"}) (),
                                SkeletonTableHeaderCell({width: "15%"}) (),
                                SkeletonTableHeaderCell({width: "15%"}) ()
                            )
                        ),
                        TableMain (
                            ...astronaut.repeat(10, TableRow (
                                ...astronaut.repeat(4, TableCell() (
                                    TextFragment({
                                        attributes: {
                                            "aui-skeletontext": true
                                        },
                                        styles: {
                                            "width": "100%"
                                        }
                                    }) ()
                                ))
                            ))
                        )
                    )
                )
            )
        );

        page.emit("setcurrentfolder", {name: entryDisplayName});

        // Try mounting provider if not already mounted

        if (!props.provider.isMounted) {
            try {
                await props.provider.mount();
            } catch (error) {
                console.warn(error);

                var tryAgainButton = Button() (_("tryAgain"));

                tryAgainButton.on("click", function() {
                    inter.render();
                });

                page.clear().add(
                    Section (
                        Message (
                            Icon("error", "dark embedded") (),
                            Heading(1) (_("places_mountError_title")),
                            Paragraph() (_("places_mountError_description")),
                            tryAgainButton
                        )
                    )
                );

                return;
            }
        }

        // Get folder entries

        var currentEntry = await props.provider.access();

        if (currentEntry.type != "folder") {
            throw new Error("Not implemented");
        }

        var listItems = {};
        var entries = {};
        var collator = files.currentLocale.createCollator();

        for (var entry of currentEntry.list) {
            if (viewOptions.sortBy == "name") {
                break;
            }

            entry.size = await entry.getSize();
            entry.lastModified = await entry.getLastModified();
        }

        var sortedList = currentEntry.list.sort(function(a, b) {
            if (viewOptions.showFoldersFirst) {
                if (a instanceof fs.FolderEntry && b instanceof fs.FileEntry) {
                    return -1;
                }

                if (a instanceof fs.FileEntry && b instanceof fs.FolderEntry) {
                    return 1;
                }
            }

            if (viewOptions.sortOrder == "descending") {
                var temp = a;

                a = b;
                b = temp;
            }

            if (viewOptions.sortBy == "size") {
                return a.size - b.size;
            }

            if (viewOptions.sortBy == "lastModified") {
                return a.lastModified?.getTime() - b.lastModified?.getTime();
            }

            return collator.compare(a.name, b.name);
        });

        // Transform entries into `ListView` format

        for await (var entry of sortedList) {
            var nameParts = entry.name.split(".");
            var displayName = entry.name;
            var displayType = entry instanceof fs.FolderEntry ? _("prop_type_folder") : _("prop_type_file");

            if (nameParts.length > 1) {
                if (!viewOptions.showHiddenFiles && nameParts[0] == "") {
                    continue;
                }

                if (entry instanceof fs.FileEntry) {
                    if (nameParts[0] == "") {
                        displayType = _("prop_type_hiddenFile");
                    } else {
                        if (!viewOptions.showFileExtensions) {
                            displayName = nameParts.slice(0, -1).join(".");
                        }

                        displayType = _("prop_type_fileWithExtension", {extension: nameParts.at(-1).toLocaleUpperCase()});
                    }
                }
    
                if (entry instanceof fs.FolderEntry && nameParts[0] == "") {
                    displayType = _("prop_type_hiddenFolder");
                }
            }

            var size = await entry.getSize();
            var displaySize = "";

            if (size != null) {
                displaySize = sizeUnits.getString(size, _);
            }

            var lastModified = await entry.getLastModified();
            var displayLastModified = "";

            if (lastModified != null) {
                // TODO: Display as relative time (implement in Adapt UI, like how `sizeUnits` is)
                displayLastModified = _format(lastModified);
            }

            entries[entry.name] = entry;

            listItems[entry.name] = {
                name: displayName,
                type: displayType,
                size: displaySize,
                lastModified: displayLastModified
            };
        }

        if (Object.keys(listItems).length == 0) {
            page.clear().add(
                Section({mode: "wide"}) (
                    Heading(1) (entryDisplayName),
                    Message (
                        Icon("folder", "dark embedded") (),
                        Paragraph() (_("places_emptyFolderMessage"))
                    )
                )
            );

            return;
        }

        var headerCellsForProps = {
            name: TableHeaderCell({
                mode: "resize",
                styles: {
                    "width": "100%"
                }
            }) (_("prop_name")),
            type: TableHeaderCell({mode: "resize"}) (_("prop_type")),
            size: TableHeaderCell({mode: "resize"}) (_("prop_size")),
            lastModified: TableHeaderCell({mode: "resize"}) (_("prop_lastModified"))
        };

        var listView = listViews.ListView({
            mode: "truncate",
            items: listItems,
            keyOrder: viewOptions.showProps
        }) (
            viewOptions.showProps.map((type) => headerCellsForProps[type])
        );

        listView.on("activaterow", function(event) {
            var entry = entries[event.detail.key];

            if (entry instanceof fs.FolderEntry) {
                backJourney = [];

                props.provider.visit(event.detail.key);

                inter.render();
            }
        });

        page.clear().add(
            Section({mode: "wide"}) (
                Heading(1) (entryDisplayName),
                listView
            )
        );
    };

    inter.back = function() {
        if (props.provider.currentPath.length == 0) {
            return;
        }

        backJourney.push([...props.provider.currentPath]);

        props.provider.up();

        inter.render();
    };

    inter.forward = function() {
        if (backJourney.length > 0) {
            props.provider.currentPath = backJourney.pop();

            inter.render();
        }
    };

    inter.visit = function() {
        inter.render();

        page.emit("visit");

        return page.pageFade();
    };

    return page;
});

export var ManagerScreen = astronaut.component("ManagerScreen", function(props, children) {
    var backButton = IconButton("back", _("back")) ();
    var forwardButton = IconButton("forward", _("forward")) ();
    var headerCurrentFolderName = TextFragment() (_("files"));
    var pageMenuButtonContainer = Container() ();

    var currentProviderPage = null;

    var sortMenu = Menu() ();
    var viewMenu = Menu() ();
    
    var sortButton = IconButton("filter", _("sortingOptions")) ();
    var viewButton = IconButton("visual", _("viewOptions")) ();

    var screen = Screen(props) (
        Header (
            HeaderPageMenuButton({alt: _("openMenu")}) (),
            backButton,
            forwardButton,
            headerCurrentFolderName,
            sortButton,
            viewButton
        ),
        PageMenu (
            Accordion(true) (
                _("places"),
                pageMenuButtonContainer
            )
        ),
        Page({
            showing: true,
            styles: {
                "display": "flex",
                "flex-direction": "column",
                "justify-content": "center"
            }
        }) (
            Message (
                Icon("folder", "dark embedded") (),
                Paragraph() (_("places_blankMessage"))
            )
        ),
        sortMenu,
        viewMenu
    );

    function sortByTypeMenuButtonFactory(type) {
        var button = MenuButton({isCheckable: true, isChecked: viewOptions.sortBy == type}) (_(`prop_${type}`));

        button.on("click", function() {
            viewOptions.sortBy = type;

            currentProviderPage?.inter.render();
            updateSortMenu();

            sortMenu.menuClose();
        });

        return button;
    }

    function sortOrderMenuButtonFactory(order) {
        var button = MenuButton({isCheckable: true, isChecked: viewOptions.sortOrder == order}) (_(`sortingOptions_${order}`));

        button.on("click", function() {
            viewOptions.sortOrder = order;

            currentProviderPage?.inter.render();
            updateSortMenu();

            sortMenu.menuClose();
        });

        return button;
    }

    function updateSortMenu() {
        sortMenu.clear().add(
            sortByTypeMenuButtonFactory("name"),
            sortByTypeMenuButtonFactory("size"),
            sortByTypeMenuButtonFactory("lastModified"),
            Separator() (),
            sortOrderMenuButtonFactory("ascending"),
            sortOrderMenuButtonFactory("descending")
        );
    }

    function viewShowPropMenuButtonFactory(type) {
        var button = MenuButton({isCheckable: true, isChecked: viewOptions.showProps.includes(type)}) (_(`prop_${type}`));

        button.on("click", function() {
            if (!viewOptions.showProps.includes(type)) {
                viewOptions.showProps.push(type);
            } else if (viewOptions.showProps.length > 1) {
                viewOptions.showProps = viewOptions.showProps.filter((currentType) => currentType != type);
            }

            currentProviderPage?.inter.render();
            updateViewMenu();

            viewMenu.menuClose();
        });

        return button;
    }

    function viewToggleMenuButtonFactory(key) {
        var button = MenuButton({isCheckable: true, isChecked: viewOptions[key]}) (_(`viewOptions_${key}`));

        button.on("click", function() {
            viewOptions[key] = !viewOptions[key];

            currentProviderPage?.inter.render();
            updateViewMenu();

            viewMenu.menuClose();
        });

        return button;
    }

    function updateViewMenu() {
        viewMenu.clear().add(
            viewShowPropMenuButtonFactory("name"),
            viewShowPropMenuButtonFactory("type"),
            viewShowPropMenuButtonFactory("size"),
            viewShowPropMenuButtonFactory("lastModified"),
            Separator() (),
            viewToggleMenuButtonFactory("showFoldersFirst"),
            viewToggleMenuButtonFactory("showFileExtensions"),
            viewToggleMenuButtonFactory("showHiddenFiles")
        );
    }

    function addProvider(provider) {
        var page = ProviderPage({provider}) ();
        var pageMenuButton = PageMenuButton({page}) (provider.name);

        page.on("visit", function() {
            currentProviderPage = page;
        });

        page.on("setcurrentfolder", function(event) {
            headerCurrentFolderName.setText(event.detail.name);
        });

        pageMenuButton.on("click", function() {
            page.inter.visit();
        });

        screen.add(page);
        pageMenuButtonContainer.add(pageMenuButton);

        return page;
    }

    backButton.on("click", function() {
        currentProviderPage?.inter.back();
    });

    forwardButton.on("click", function() {
        currentProviderPage?.inter.forward();
    });

    sortButton.on("click", function() {
        sortMenu.menuOpen();
    });

    viewButton.on("click", function() {
        viewMenu.menuOpen();
    });

    updateSortMenu();
    updateViewMenu();

    if (common.IS_SYSTEM_APP) {
        var providerPage = addProvider(new localFsProvider.LocalFilesystem(_("places_internal")));

        providerPage.inter.visit();
    } else {
        addProvider(new localFsProvider.LocalFilesystem(_("places_local")));
    }

    return screen;
});