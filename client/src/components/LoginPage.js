import React, { useState } from "react";
import {
    VStack,
    Input,
    Button,
    FormControl,
    FormLabel,
    useToast,
    Container,
    Heading,
} from "@chakra-ui/react";

function LoginPage({ onLogin }) {
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ password }),
                }
            );

            const data = await response.json();

            if (response.ok && data.token) {
                localStorage.setItem("authToken", data.token);
                onLogin(true);
            } else {
                throw new Error(data.error || "Invalid password");
            }
        } catch (error) {
            toast({
                title: "Access Denied",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
        setIsLoading(false);
    };

    return (
        <Container maxW="container.sm" py={10}>
            <VStack spacing={8}>
                <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter access password"
                            />
                        </FormControl>
                        <Button
                            type="submit"
                            colorScheme="blue"
                            width="100%"
                            isLoading={isLoading}
                        >
                            Login
                        </Button>
                    </VStack>
                </form>
            </VStack>
        </Container>
    );
}

export default LoginPage;
