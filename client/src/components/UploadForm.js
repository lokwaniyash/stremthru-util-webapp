import React, { useState } from 'react';
import {
  VStack,
  Input,
  Button,
  Text,
  Link,
  List,
  ListItem,
  useClipboard,
  Card,
  CardBody,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';

function UploadForm({ onSuccess, onError }) {
  const [file, setFile] = useState(null);
  const [magnet, setMagnet] = useState('');
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { onCopy } = useClipboard('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleMagnetChange = (e) => {
    setMagnet(e.target.value);
  };

  const handleSubmit = async (type) => {
    setIsLoading(true);
    try {
      let response;
      
      if (type === 'magnet') {
        response = await fetch(`${process.env.REACT_APP_API_URL}/magnet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ magnetLink: magnet }),
        });
      } else {
        const formData = new FormData();
        formData.append('torrent', file);
        
        response = await fetch(`${process.env.REACT_APP_API_URL}/torrent`, {
          method: 'POST',
          body: formData,
        });
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setLinks(data.links);
      onSuccess(data.links);
      
      // Clear form
      setFile(null);
      setMagnet('');
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={6} width="100%">
      <Card width="100%">
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Upload Torrent File</FormLabel>
              <Input
                type="file"
                accept=".torrent"
                onChange={handleFileChange}
                padding={1}
              />
            </FormControl>
            <Button
              colorScheme="blue"
              onClick={() => handleSubmit('file')}
              isDisabled={!file || isLoading}
              isLoading={isLoading}
              width="100%"
            >
              Upload Torrent
            </Button>
          </VStack>
        </CardBody>
      </Card>

      <Card width="100%">
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Or Paste Magnet Link</FormLabel>
              <Input
                placeholder="magnet:?xt=urn:btih:..."
                value={magnet}
                onChange={handleMagnetChange}
              />
            </FormControl>
            <Button
              colorScheme="blue"
              onClick={() => handleSubmit('magnet')}
              isDisabled={!magnet || isLoading}
              isLoading={isLoading}
              width="100%"
            >
              Submit Magnet
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {links.length > 0 && (
        <Card width="100%">
          <CardBody>
            <Text mb={4} fontWeight="bold">Generated Download Links:</Text>
            <List spacing={3}>
              {links.map((link, index) => (
                <ListItem key={index}>
                  <Link 
                    href={link.proxy} 
                    color="blue.500" 
                    isExternal
                    onClick={(e) => {
                      e.preventDefault();
                      onCopy(link.proxy);
                    }}
                  >
                    {link.proxy}
                  </Link>
                </ListItem>
              ))}
            </List>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}

export default UploadForm;