# AI Integration Deployment Instructions

## Prerequisites

1. **Supabase CLI**: Install the latest version of Supabase CLI
2. **API Keys**: Obtain API keys from:
   - OpenAI (https://platform.openai.com/api-keys)
   - AssemblyAI (https://www.assemblyai.com/dashboard/signup)
   - ElevenLabs (https://elevenlabs.io/sign-up)

## Environment Setup

### 1. Supabase Secrets Configuration

Set the required API keys as Supabase secrets:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Set AssemblyAI API key
supabase secrets set ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

# Set ElevenLabs API key
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 2. Deploy Edge Functions

Deploy each edge function individually:

```bash
# Deploy OpenAI suggestions function
supabase functions deploy openai-suggestions

# Deploy voice transcription function
supabase functions deploy voice-transcription

# Deploy text-to-speech function
supabase functions deploy text-to-speech
```

### 3. Verify Deployment

Test each function after deployment:

```bash
# Test OpenAI suggestions
curl -X POST 'https://your-project.supabase.co/functions/v1/openai-suggestions' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"taskTitle": "Test task"}'

# Test voice transcription (with base64 audio data)
curl -X POST 'https://your-project.supabase.co/functions/v1/voice-transcription' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"audioData": "base64_audio_data_here"}'

# Test text-to-speech
curl -X POST 'https://your-project.supabase.co/functions/v1/text-to-speech' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "Hello world"}'
```

## Frontend Deployment

### 1. Install Dependencies

Ensure all new dependencies are installed:

```bash
npm install
```

### 2. Build and Deploy

Build the application with the new AI features:

```bash
npm run build
```

Deploy to your hosting platform (Netlify, Vercel, etc.).

## Configuration Verification

### 1. Check Function URLs

Verify that the edge functions are accessible:
- `https://your-project.supabase.co/functions/v1/openai-suggestions`
- `https://your-project.supabase.co/functions/v1/voice-transcription`
- `https://your-project.supabase.co/functions/v1/text-to-speech`

### 2. Test Browser Permissions

Ensure the application requests proper browser permissions:
- Microphone access for voice recording
- Notification permissions for audio playback

### 3. Verify CORS Settings

Ensure CORS headers are properly configured in edge functions for your domain.

## Monitoring and Logging

### 1. Function Logs

Monitor edge function logs:

```bash
supabase functions logs openai-suggestions
supabase functions logs voice-transcription
supabase functions logs text-to-speech
```

### 2. Error Tracking

Set up error tracking for:
- API rate limiting
- Authentication failures
- Audio processing errors
- Network timeouts

## Performance Optimization

### 1. Caching Strategy

Implement caching for:
- AI suggestions for similar tasks
- Voice model loading
- Audio file processing

### 2. Rate Limiting

Configure rate limiting:
- OpenAI: 3 requests per minute per user
- AssemblyAI: 5 concurrent transcriptions
- ElevenLabs: 10 requests per minute per user

### 3. Audio Optimization

Optimize audio processing:
- Compress audio before upload
- Use appropriate sample rates
- Implement audio chunking for large files

## Security Considerations

### 1. API Key Protection

- Never expose API keys in client-side code
- Rotate API keys regularly
- Monitor API usage for anomalies

### 2. Input Validation

- Validate all user inputs
- Sanitize text before AI processing
- Limit audio file sizes and durations

### 3. Authentication

- Ensure all edge functions verify JWT tokens
- Implement proper user authorization
- Log all API access attempts

## Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Verify secrets are set correctly
   - Redeploy functions after setting secrets

2. **CORS errors**
   - Check CORS headers in edge functions
   - Verify domain whitelist

3. **Audio recording not working**
   - Check browser permissions
   - Verify HTTPS connection
   - Test microphone access

4. **Transcription timeouts**
   - Check audio file size and format
   - Verify AssemblyAI API limits
   - Implement retry logic

### Debug Commands

```bash
# Check function status
supabase functions list

# View function logs
supabase functions logs <function-name> --follow

# Test local development
supabase functions serve

# Check secrets
supabase secrets list
```

## Rollback Procedure

If issues occur after deployment:

1. **Revert Edge Functions**:
   ```bash
   # Deploy previous version
   git checkout previous-commit
   supabase functions deploy openai-suggestions
   ```

2. **Disable Features**:
   - Set feature flags to disable AI features
   - Redirect to fallback implementations

3. **Monitor Recovery**:
   - Check error rates
   - Verify user experience
   - Monitor API usage

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Review API usage and costs
   - Check error logs
   - Update rate limits if needed

2. **Monthly**:
   - Rotate API keys
   - Review performance metrics
   - Update AI models if available

3. **Quarterly**:
   - Audit security settings
   - Review and optimize costs
   - Update documentation

### Cost Monitoring

Monitor API costs:
- OpenAI: ~$0.002 per 1K tokens
- AssemblyAI: ~$0.00037 per second
- ElevenLabs: ~$0.30 per 1K characters

Set up billing alerts for each service to prevent unexpected charges.