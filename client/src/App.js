import React from 'react';
import { ChakraProvider, Container, VStack, Heading, useToast } from '@chakra-ui/react';
import UploadForm from './components/UploadForm';

function App() {
  const toast = useToast();

  const handleSuccess = (links) => {
    toast({
      title: 'Success!',
      description: `Generated ${links.length} download links`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleError = (error) => {
    toast({
      title: 'Error',
      description: error,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <ChakraProvider>
      <Container maxW="container.md" py={10}>
        <VStack spacing={8}>
          <Heading>Real-Debrid Link Generator</Heading>
          <UploadForm onSuccess={handleSuccess} onError={handleError} />
        </VStack>
      </Container>
    </ChakraProvider>
  );
}

export default App;