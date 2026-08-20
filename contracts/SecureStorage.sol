// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SecureStorage {

    struct FileRecord {
        uint256 id;
        address owner;
        string fileName;
        string ipfsCid;
        uint256 timestamp;
    }

    uint256 private nextFileId = 1;

    mapping(uint256 => FileRecord) private files;

    mapping(address => uint256[]) private userFiles;

    event FileStored(
        uint256 indexed fileId,
        address indexed owner,
        string fileName,
        string ipfsCid,
        uint256 timestamp
    );

    function storeFile(
        string memory fileName,
        string memory ipfsCid
    ) external returns (uint256) {

        require(
            bytes(fileName).length > 0,
            "File name required"
        );

        require(
            bytes(ipfsCid).length > 0,
            "IPFS CID required"
        );

        uint256 fileId = nextFileId;

        files[fileId] = FileRecord({
            id: fileId,
            owner: msg.sender,
            fileName: fileName,
            ipfsCid: ipfsCid,
            timestamp: block.timestamp
        });

        userFiles[msg.sender].push(fileId);

        nextFileId++;

        emit FileStored(
            fileId,
            msg.sender,
            fileName,
            ipfsCid,
            block.timestamp
        );

        return fileId;
    }

    function getFile(
        uint256 fileId
    )
        external
        view
        returns (
            uint256 id,
            address owner,
            string memory fileName,
            string memory ipfsCid,
            uint256 timestamp
        )
    {

        FileRecord memory file = files[fileId];

        require(
            file.id != 0,
            "File not found"
        );

        return (
            file.id,
            file.owner,
            file.fileName,
            file.ipfsCid,
            file.timestamp
        );
    }

    function getUserFiles(
        address owner
    )
        external
        view
        returns (uint256[] memory)
    {
        return userFiles[owner];
    }
}
