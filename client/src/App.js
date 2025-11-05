import React, { useState, useEffect } from "react";
import {
    ChakraProvider,
    ColorModeScript,
    Container,
    VStack,
    Heading,
    useToast,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Box,
} from "@chakra-ui/react";
import UploadForm from "./components/UploadForm";
import TorrentList from "./components/TorrentList";
import LoginPage from "./components/LoginPage";
import theme from "./theme";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setIsAuthenticated(false);
                return;
            }

            try {
                // Verify token by making a request to the torrents endpoint
                const response = await fetch(
                    `${process.env.REACT_APP_API_URL}/torrents`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error("Invalid token");
                }

                setIsAuthenticated(true);
            } catch (error) {
                setIsAuthenticated(false);
                localStorage.removeItem("authToken");
            }
        };

        checkAuth();
    }, []);

    const handleSuccess = (links) => {
        toast({
            title: "Success!",
            description: `Generated ${links.length} download links`,
            status: "success",
            duration: 5000,
            isClosable: true,
        });
    };

    const handleError = (error) => {
        toast({
            title: "Error",
            description: error,
            status: "error",
            duration: 5000,
            isClosable: true,
        });
    };

    if (!isAuthenticated) {
        return (
            <>
                <ColorModeScript
                    initialColorMode={theme.config.initialColorMode}
                />
                <ChakraProvider theme={theme}>
                    <LoginPage onLogin={setIsAuthenticated} />
                </ChakraProvider>
            </>
        );
    }

    return (
        <>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />
            <ChakraProvider theme={theme}>
                <Box minH="100vh" bg="gray.900" color="white">
                    <Container maxW="container.xl" py={10}>
                        <VStack spacing={8} align="stretch">
                            <Tabs variant="unstyled">
                                <TabList border="none" mb={4}>
                                    <Tab
                                        _selected={{
                                            color: "teal.300",
                                            fontWeight: "bold",
                                            borderBottom: "2px solid",
                                            borderColor: "teal.300",
                                        }}
                                        _hover={{
                                            color: "teal.300",
                                            bg: "whiteAlpha.100",
                                        }}
                                        color="gray.400"
                                    >
                                        Upload
                                    </Tab>
                                    <Tab
                                        _selected={{
                                            color: "teal.300",
                                            fontWeight: "bold",
                                            borderBottom: "2px solid",
                                            borderColor: "teal.300",
                                        }}
                                        _hover={{
                                            color: "teal.300",
                                            bg: "whiteAlpha.100",
                                        }}
                                        color="gray.400"
                                    >
                                        Torrents
                                    </Tab>
                                </TabList>
                                <TabPanels>
                                    <TabPanel p={0}>
                                        <UploadForm
                                            onSuccess={handleSuccess}
                                            onError={handleError}
                                        />
                                    </TabPanel>
                                    <TabPanel p={0}>
                                        <TorrentList />
                                    </TabPanel>
                                </TabPanels>
                            </Tabs>
                        </VStack>
                    </Container>
                </Box>
            </ChakraProvider>
        </>
    );
}

export default App;
