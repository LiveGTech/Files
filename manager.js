/*
    Files

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

import * as common from "./common.js";
import * as localFsProvider from "./providers/local.js"

var astronaut = await import(`${common.AUI_URL_PREFIX}/astronaut/astronaut.js`);

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
                        Message (
                            Icon("error", "dark embedded") (),
                            Heading(1) (_("places_mountError_title")),
                            Paragraph() (_("places_mountError_description")),
                            tryAgainButton
                        )
                    );

                    return;
                }
            }

            console.log(await provider.access()); // TODO: Populate table with entries
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