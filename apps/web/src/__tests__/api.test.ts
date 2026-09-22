import { fetchApi, setAccessToken, getAccessToken, clearAccessToken } from '../lib/api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('fetchApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
    clearAccessToken();
  });

  it('should manage access token in module memory without exposing to window', () => {
    setAccessToken('mock-mem-token');
    expect(getAccessToken()).toBe('mock-mem-token');
    expect((window as any).__ABOS_ACCESS_TOKEN__).toBeUndefined();
    
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it('should handle 204 No Content without crashing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockRejectedValue(new Error('SyntaxError: Unexpected end of JSON input'))
    });
    const result = await fetchApi('/test-204');
    expect(result).toBeNull();
  });

  it('should dispatch auth:401 and throw on 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers()
    });
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
    
    await expect(fetchApi('/secret')).rejects.toThrow('Unauthorized');
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect((dispatchEventSpy.mock.calls[0][0] as CustomEvent).type).toBe('auth:401');
    
    dispatchEventSpy.mockRestore();
  });
  
  it('should parse application/json successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true })
    });
    const result = await fetchApi('/test-json');
    expect(result).toEqual({ success: true });
  });
});
