import { useState } from 'react'
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloudIcon from '@mui/icons-material/Cloud'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('unknown')

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Stack direction="row" spacing={2} justifyContent="center" mb={3}>
          <Chip label="Vite" color="primary" variant="outlined" />
          <Chip label="React 19" color="secondary" variant="outlined" />
          <Chip label="Cloudflare" color="success" variant="outlined" />
          <Chip label="MUI 7" color="info" variant="outlined" />
        </Stack>

        <Typography variant="h2" component="h1" gutterBottom>
          My Finance
        </Typography>

        <Typography variant="h5" color="text.secondary" gutterBottom>
          Modern Finance Management App
        </Typography>

        <Card sx={{ mt: 4, mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Counter Demo
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCount((count) => count + 1)}
              size="large"
            >
              Count is {count}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Edit <code>src/App.tsx</code> and save to test HMR
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cloudflare Workers API
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudIcon />}
              onClick={() => {
                fetch('/api/')
                  .then((res) => res.json() as Promise<{ name: string }>)
                  .then((data) => setName(data.name))
              }}
              size="large"
            >
              Name from API: {name}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Edit <code>worker/index.ts</code> to change the name
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Built with Material UI v7
        </Typography>
      </Box>
    </Container>
  )
}

export default App
