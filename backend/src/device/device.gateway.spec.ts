import { WsException } from '@nestjs/websockets';
/* eslint-disable @typescript-eslint/unbound-method */
import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { DeviceGateway } from './device.gateway';
import type { DeviceService } from './device.service';

describe('DeviceGateway', () => {
  const deviceService = {
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
    isDeviceConnected: jest.fn().mockReturnValue(true),
    getCurrentPatient: jest.fn().mockReturnValue(null),
    getActiveDeviceId: jest.fn().mockReturnValue('esp32-reaccion-01'),
    startSocketTest: jest
      .fn()
      .mockResolvedValue({ startedAt: '2026-01-01T00:00:00Z' }),
    receiveSocketResult: jest.fn(),
  };
  const jwtService = { verifyAsync: jest.fn() };
  const roomEmit = jest.fn();
  let gateway: DeviceGateway;

  const socket = (
    options: {
      id?: string;
      auth?: Record<string, unknown>;
      query?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {},
  ) =>
    ({
      id: options.id ?? 'socket-1',
      data: {},
      handshake: {
        auth: options.auth ?? {},
        query: options.query ?? {},
        headers: options.headers ?? {},
        address: '192.168.20.134',
      },
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    }) as unknown as Socket;

  beforeEach(() => {
    jest.clearAllMocks();
    deviceService.isDeviceConnected.mockReturnValue(true);
    gateway = new DeviceGateway(
      deviceService as unknown as DeviceService,
      jwtService as unknown as JwtService,
    );
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    } as unknown as Server;
  });

  it.each([
    [{ auth: { clientType: 'esp32' } }],
    [{ query: { clientType: 'ESP32' } }],
    [{ headers: { 'x-device-type': ' esp32 ' } }],
  ])('marks handshake ESP32 sockets online provisionally', async (options) => {
    const client = socket(options);
    await gateway.handleConnection(client);

    expect(client.data).toEqual({
      role: 'esp32',
      deviceId: 'esp32-reaccion-01',
    });
    expect(client.join as jest.Mock).toHaveBeenCalledWith('esp32');
    expect(deviceService.connect).toHaveBeenCalledWith({
      deviceId: 'esp32-reaccion-01',
      ipAddress: '192.168.20.134',
    });
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('allows an unidentified socket to identify itself with deviceConnected', async () => {
    const client = socket();
    await gateway.handleConnection(client);

    expect(client.data).toEqual({ role: 'pending' });
    expect(client.disconnect as jest.Mock).not.toHaveBeenCalled();
    expect(deviceService.connect).not.toHaveBeenCalled();
  });

  it('identifies the ESP32 from its event and persists its metadata', async () => {
    const client = socket();
    await gateway.handleConnection(client);

    await gateway.handleDeviceConnected(
      {
        deviceId: 'esp32-reaccion-01',
        deviceType: 'esp32',
        ipAddress: '192.168.20.134',
        rssi: -47,
      },
      client,
    );

    expect(client.data).toEqual({
      role: 'esp32',
      deviceId: 'esp32-reaccion-01',
    });
    expect(client.join as jest.Mock).toHaveBeenCalledWith('esp32');
    expect(deviceService.connect).toHaveBeenCalledWith({
      deviceId: 'esp32-reaccion-01',
      ipAddress: '192.168.20.134',
      rssi: -47,
    });
    expect(roomEmit).toHaveBeenCalledWith(
      'deviceStatusChanged',
      expect.objectContaining({ connected: true }),
    );
  });

  it('rejects an explicitly identified frontend without JWT', async () => {
    const client = socket({ auth: { clientType: 'frontend' } });
    await gateway.handleConnection(client);

    expect(client.disconnect as jest.Mock).toHaveBeenCalledWith(true);
  });

  it('keeps frontend JWT authentication and joins its room', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    const client = socket({ auth: { clientType: 'frontend', token: 'jwt' } });
    await gateway.handleConnection(client);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt');
    expect(client.data).toEqual({ role: 'frontend', userId: 'user-1' });
    expect(client.join as jest.Mock).toHaveBeenCalledWith('frontend');
  });

  it('does not mark the ESP32 offline when a frontend disconnects', async () => {
    const client = socket();
    client.data = { role: 'frontend', userId: 'user-1' };

    await gateway.handleDisconnect(client);

    expect(deviceService.disconnect).not.toHaveBeenCalled();
  });

  it('marks only the identified ESP32 offline when its socket disconnects', async () => {
    const client = socket();
    await gateway.handleConnection(client);
    await gateway.handleDeviceConnected(
      {
        deviceId: 'esp32-reaccion-01',
        deviceType: 'esp32',
        ipAddress: '192.168.20.134',
        rssi: -47,
      },
      client,
    );
    deviceService.isDeviceConnected.mockReturnValue(false);

    await gateway.handleDisconnect(client);

    expect(deviceService.disconnect).toHaveBeenCalledWith('esp32-reaccion-01');
    expect(roomEmit).toHaveBeenCalledWith(
      'deviceStatusChanged',
      expect.objectContaining({ connected: false }),
    );
  });

  it('does not mark a device offline while a replacement socket is active', async () => {
    const first = socket({ id: 'esp32-old' });
    const replacement = socket({ id: 'esp32-new' });
    const identity = {
      deviceId: 'esp32-reaccion-01',
      deviceType: 'esp32',
      ipAddress: '192.168.20.134',
      rssi: -47,
    };
    await gateway.handleConnection(first);
    await gateway.handleConnection(replacement);
    await gateway.handleDeviceConnected(identity, first);
    await gateway.handleDeviceConnected(identity, replacement);

    await gateway.handleDisconnect(first);

    expect(deviceService.disconnect).not.toHaveBeenCalled();
  });

  it('only lets frontend sockets send startTest to the ESP32 room', async () => {
    const client = socket();
    client.data = { role: 'frontend' };
    const body = { patientId: 'patient-1', level: '1' };

    await gateway.handleStartTest(body, client);

    expect(gateway.server.to as jest.Mock).toHaveBeenCalledWith('esp32');
    expect(roomEmit).toHaveBeenCalledWith('startTest', body);
  });

  it('rejects testFinished from a frontend socket', async () => {
    const client = socket();
    client.data = { role: 'frontend' };

    await expect(
      gateway.handleTestFinished(
        { patientId: 'patient-1', reactionTime: 200 },
        client,
      ),
    ).rejects.toBeInstanceOf(WsException);
    expect(deviceService.receiveSocketResult).not.toHaveBeenCalled();
  });

  it('persists an ESP32 result and then publishes the updated status', async () => {
    deviceService.receiveSocketResult.mockResolvedValue({
      measurement: {
        id: 'measurement-1',
        paciente_id: '517a1365-b828-42ff-8c7b-c95323f08b1c',
        tiempo_reaccion: 1500,
        estado: 'riesgo',
        fecha: '2026-01-01T00:00:00Z',
      },
      result: {
        deviceId: 'esp32-reaccion-01',
        patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
        reactionTime: 1500,
        selectedLevel: 1,
        success: false,
        correctButton: 0,
        pressedButton: null,
        timeout: true,
        deviceTimestamp: null,
        receivedAt: '2026-01-01T00:00:00Z',
      },
    });
    const client = socket();
    client.data = { role: 'esp32', deviceId: 'esp32-reaccion-01' };
    const body = {
      deviceId: 'esp32-reaccion-01',
      patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
      reactionTime: 1500,
      selectedLevel: 1,
      success: false,
      correctButton: 0,
      pressedButton: null,
      timeout: true,
    };

    const response = await gateway.handleTestFinished(body, client);

    expect(deviceService.receiveSocketResult).toHaveBeenCalledWith(body);
    expect(client.emit as jest.Mock).toHaveBeenCalledWith(
      'testResultSaved',
      expect.objectContaining({
        result: expect.objectContaining({
          success: false,
          timeout: true,
          pressedButton: null,
          deviceTimestamp: null,
        }),
      }),
    );
    expect(response).toEqual({ ok: true, measurementId: 'measurement-1' });
    expect(roomEmit).toHaveBeenCalledWith(
      'deviceStatus',
      expect.objectContaining({ connected: true, patientId: null }),
    );
  });

  it('returns the real processing error to the ESP32', async () => {
    deviceService.receiveSocketResult.mockRejectedValueOnce(
      new Error('La columna fecha no acepta el valor recibido'),
    );
    const client = socket();
    client.data = { role: 'esp32', deviceId: 'esp32-reaccion-01' };

    await expect(
      gateway.handleTestFinished(
        {
          patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
          reactionTime: 1500,
        },
        client,
      ),
    ).rejects.toMatchObject({
      error: {
        status: 'error',
        message: 'La columna fecha no acepta el valor recibido',
      },
    });
  });
});
