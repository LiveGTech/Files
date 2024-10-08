/*
    Files

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

export class Entry {
    constructor(name, filesystem, parentPath) {
        this.name = name;
        this.filesystem = filesystem;
        this.parentPath = parentPath;
    }

    async getSize() {
        return null;
    }

    async getLastModified() {
        return null;
    }

    visit() {
        this.filesystem.currentPath = [...this.parentPath, this.name];
    }
}

export class FileEntry extends Entry {}
export class FolderEntry extends Entry {}

export class Filesystem {
    constructor(name) {
        this.name = name;
        this.currentPath = [];
    }

    async mount() {}

    get isMounted() {
        return true;
    }

    get entryName() {
        return this.currentPath.at(-1) ?? null;
    }

    up() {
        this.currentPath.pop();
    }

    visit(entry) {
        this.currentPath.push(entry);
    }

    async access() {
        throw new Error("Not implemented");
    }
}