import React, { useState, useEffect } from "react";
import {
    VStack,
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Button,
    Text,
    Progress,
    Badge,
    useToast,
    HStack,
    Icon,
    Tooltip,
    useClipboard,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";

function TorrentActions({ link, toast }) {
    const [proxyUrl, setProxyUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const generateProxyUrl = async () => {
        if (proxyUrl) return proxyUrl;

        setIsLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/unrestrict-link`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ link: link }),
                }
            );

            const data = await response.json();
            console.log("API Response:", data); // Debug log

            if (!response.ok) {
                throw new Error(data.error || "Failed to get download link");
            }

            console.log("Proxy URL:", data.proxyUrl); // Debug log
            setProxyUrl(data.proxyUrl);
            setIsLoading(false);
            return data.proxyUrl;
        } catch (error) {
            console.error("Error:", error); // Debug log
            toast({
                title: "Error",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            setIsLoading(false);
            return null;
        }
    };

    const handleCopy = async () => {
        const url = await generateProxyUrl();
        console.log("URL to copy:", url); // Debug log
        if (url) {
            await navigator.clipboard.writeText(url);
            toast({
                title: "Copied!",
                description: "Download link copied to clipboard",
                status: "success",
                duration: 2000,
                isClosable: true,
            });
        } else {
            toast({
                title: "Error",
                description: "Failed to generate download link",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleDownload = async () => {
        const url = await generateProxyUrl();
        if (url) {
            window.open(url, "_blank");
            toast({
                title: "Opening download...",
                status: "info",
                duration: 2000,
                isClosable: true,
            });
        }
    };

    return (
        <HStack spacing={2}>
            <Button
                size="sm"
                colorScheme="gray"
                isLoading={isLoading}
                onClick={handleCopy}
            >
                Copy
            </Button>
            <Button
                size="sm"
                colorScheme="teal"
                isLoading={isLoading}
                onClick={handleDownload}
            >
                Download
            </Button>
        </HStack>
    );
}

function TorrentList() {
    const [torrents, setTorrents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const fetchTorrents = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/torrents`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            setTorrents(data.torrents);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch torrents",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTorrents();
        // Refresh every 30 seconds
        const interval = setInterval(fetchTorrents, 300000);
        return () => clearInterval(interval);
    }, []);

    const getStatusBadge = (status) => {
        const statusColors = {
            downloading: "blue",
            downloaded: "green",
            error: "red",
            queued: "yellow",
            waiting_files_selection: "purple",
        };
        return (
            <Badge colorScheme={statusColors[status] || "gray"}>{status}</Badge>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatSize = (bytes) => {
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes === 0) return "0 B";
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
    };

    const formatSpeed = (bytesPerSecond) => {
        if (!bytesPerSecond) return "N/A";
        return formatSize(bytesPerSecond) + "/s";
    };

    return (
        <VStack spacing={4} width="100%" align="stretch">
            <HStack justify="space-between">
                <Text fontSize="xl" fontWeight="bold">
                    Current Torrents
                </Text>
                <Button
                    leftIcon={<Icon as={RepeatIcon} />}
                    onClick={fetchTorrents}
                    isLoading={isLoading}
                    size="sm"
                >
                    Refresh
                </Button>
            </HStack>

            <Box overflowX="auto">
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Status</Th>
                            <Th>Progress</Th>
                            <Th>Size</Th>
                            <Th>Speed</Th>
                            <Th>Seeds</Th>
                            <Th>Added</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {torrents.map((torrent) => (
                            <Tr key={torrent.id}>
                                <Td>
                                    <Tooltip
                                        label={torrent.filename}
                                        placement="top"
                                    >
                                        <Text isTruncated maxW="200px">
                                            {torrent.filename}
                                        </Text>
                                    </Tooltip>
                                </Td>
                                <Td>{getStatusBadge(torrent.status)}</Td>
                                <Td>
                                    <Progress
                                        value={torrent.progress}
                                        size="sm"
                                        colorScheme={
                                            torrent.status === "error"
                                                ? "red"
                                                : "blue"
                                        }
                                    />
                                    <Text fontSize="xs" mt={1}>
                                        {torrent.progress}%
                                    </Text>
                                </Td>
                                <Td>{formatSize(torrent.bytes)}</Td>
                                <Td>{formatSpeed(torrent.speed)}</Td>
                                <Td>{torrent.seeders || "N/A"}</Td>
                                <Td>{formatDate(torrent.added)}</Td>
                                <Td>
                                    {torrent.status === "downloaded" &&
                                        torrent.links && (
                                            <TorrentActions
                                                link={torrent.links[0]}
                                                toast={toast}
                                            />
                                        )}
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Box>
        </VStack>
    );
}

export default TorrentList;
