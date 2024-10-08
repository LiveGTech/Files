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

export var ManagerScreen = astronaut.component("ManagerScreen", function(props, children) {
    var headerCurrentFolderName = TextFragment() (_("files"));
    var pageMenuButtonContainer = Container() ();

    var providerInfo = [];

    var screen = Screen(props) (
        Header (
            HeaderPageMenuButton({alt: _("openMenu")}) (),
            headerCurrentFolderName
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
        )
    );

    function addProvider(provider) {
        var page = Page() (
            Section (
                Heading() (provider.name)
            )
        );

        var pageMenuButton = PageMenuButton({page}) (provider.name);

        async function render() {
            var entryDisplayName = provider.entryName ?? provider.name;

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
                                    SkeletonTableHeaderCell({width: "15%"}) (),
                                    SkeletonTableHeaderCell({width: "60%"}) (),
                                    SkeletonTableHeaderCell({width: "25%"}) ()
                                )
                            ),
                            TableMain (
                                ...astronaut.repeat(3, TableRow (
                                    ...astronaut.repeat(3, TableCell() (
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

            headerCurrentFolderName.setText(entryDisplayName);

            if (!provider.isMounted) {
                try {
                    await provider.mount();
                } catch (error) {
                    console.warn(error);

                    var tryAgainButton = Button() (_("tryAgain"));

                    tryAgainButton.on("click", function() {
                        render();
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

            console.log(await provider.access()); // TODO: Remove once rendering implementation is complete

            var currentEntry = await provider.access();

            if (currentEntry.type != "folder") {
                throw new Error("Not implemented");
            }

            var listItems = {};
            var entries = {};
            var collator = files.currentLocale.createCollator();

            var sortedList = currentEntry.list.sort(function(a, b) {
                if (a instanceof fs.FolderEntry && b instanceof fs.FileEntry) {
                    return -1;
                }

                if (a instanceof fs.FileEntry && b instanceof fs.FolderEntry) {
                    return 1;
                }

                return collator.compare(a.name, b.name);
            });

            for await (var entry of sortedList) {
                var nameParts = entry.name.split(".");
                var displayType = entry instanceof fs.FolderEntry ? _("prop_type_folder") : _("prop_type_file");

                if (entry instanceof fs.FileEntry && nameParts.length > 1) {
                    if (nameParts[0] == "") {
                        displayType = _("prop_type_hiddenFile");
                    } else {
                        displayType = _("prop_type_fileWithExtension", {extension: nameParts.at(-1).toLocaleUpperCase()});
                    }
                }

                if (entry instanceof fs.FolderEntry && nameParts.length > 1 && nameParts[0] == "") {
                    displayType = _("prop_type_hiddenFolder");
                }

                var size = await entry.getSize();
                var displaySize = "";

                if (size) {
                    displaySize = sizeUnits.getString(size, _);
                }

                var lastModified = await entry.getLastModified();
                var displayLastModified = "";

                if (lastModified) {
                    // TODO: Display as relative time (implement in Adapt UI, like how `sizeUnits` is)
                    displayLastModified = _format(lastModified);
                }

                entries[entry.name] = entry;

                listItems[entry.name] = {
                    name: entry.name,
                    displayType,
                    displaySize,
                    displayLastModified
                };
            }

            var listView = listViews.ListView({
                mode: "truncate",
                items: listItems,
                keyOrder: ["name", "displayType", "displaySize", "displayLastModified"]
            }) (
                TableHeaderCell({
                    mode: "resize",
                    styles: {
                        "width": "100%"
                    }
                }) (_("prop_name")),
                TableHeaderCell({mode: "resize"}) (_("prop_type")),
                TableHeaderCell({mode: "resize"}) (_("prop_size")),
                TableHeaderCell({mode: "resize"}) (_("prop_lastModified"))
            );

            listView.on("activaterow", function(event) {
                var entry = entries[event.detail.key];

                if (entry instanceof fs.FolderEntry) {
                    provider.visit(event.detail.key);

                    render();
                }
            });

            page.clear().add(
                Section({mode: "wide"}) (
                    Heading(1) (entryDisplayName),
                    listView
                )
            );
        }

        function visit() {
            render();

            return page.pageFade();
        }

        providerInfo.push({provider, visit});

        pageMenuButton.on("click", function() {
            visit();
        });

        screen.add(page);
        pageMenuButtonContainer.add(pageMenuButton);
    }

    addProvider(new localFsProvider.LocalFilesystem(_("places_local")));

    return screen;
});