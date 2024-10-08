/*
    Files

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

import * as fs from "../fs.js";

export class LocalFileEntry extends fs.FileEntry {
    constructor(handle, filesystem, parentPath) {
        super(handle.name, filesystem, parentPath);

        this._handle = handle;
    }

    async getSize() {
        return (await this._handle.getFile()).size;
    }

    async getLastModified() {
        return (await this._handle.getFile()).lastModifiedDate;
    }
}

export class LocalFolderEntry extends fs.FolderEntry {
    constructor(handle, filesystem, parentPath) {
        super(handle.name, filesystem, parentPath);

        this._handle = handle;
    }
}

export class LocalFilesystem extends fs.Filesystem {
    constructor(name) {
        super(name);

        this._handle = null;
    }

    async mount() {
        this._handle = await window.showDirectoryPicker();
    }

    get isMounted() {
        return !!this._handle;
    }

    _checkMounted() {
        if (!this.isMounted) {
            throw new Error("Not mounted");
        }
    }

    async _getCurrentPathHandle() {
        this._checkMounted();

        var path = [...this.currentPath];
        var handle = this._handle;

        while (path.length > 0) {
            handle = (await handle.values()).find((childHandle) => childHandle.name == path[0]);

            if (!handle) {
                return null;
            }
        }

        return handle;
    }

    async access() {
        var handle = await this._getCurrentPathHandle();

        if (handle.kind == "directory") {
            return {
                type: "folder",
                list: (await Array.fromAsync(await handle.values())).map((childHandle) => new (childHandle.kind == "directory" ? LocalFolderEntry : LocalFileEntry)(childHandle, this, this.currentPath))
            };
        }

        return {type: "file"};
    }
}