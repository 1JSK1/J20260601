package com.myapp.devicecontrol

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

class PcmRecorderModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private const val SAMPLE_RATE = 16000
    private const val FRAME_BYTES = 6400
    private const val EVENT_AUDIO_FRAME = "PcmRecorderFrame"
    private const val EVENT_RECORDER_ERROR = "PcmRecorderError"
  }

  private val recording = AtomicBoolean(false)
  private var audioRecord: AudioRecord? = null
  private var recordingThread: Thread? = null

  override fun getName(): String = "PcmRecorder"

  @ReactMethod
  fun start(promise: Promise) {
    if (recording.get()) {
      promise.resolve(null)
      return
    }
    if (
      ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("MIC_PERMISSION_DENIED", "Microphone permission is required")
      return
    }

    try {
      val minimumBuffer = AudioRecord.getMinBufferSize(
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
      )
      if (minimumBuffer <= 0) {
        promise.reject("RECORDER_UNAVAILABLE", "Unable to create an Android AudioRecord buffer")
        return
      }

      val recorder = AudioRecord(
        MediaRecorder.AudioSource.VOICE_RECOGNITION,
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        maxOf(minimumBuffer, FRAME_BYTES * 2)
      )
      if (recorder.state != AudioRecord.STATE_INITIALIZED) {
        recorder.release()
        promise.reject("RECORDER_UNAVAILABLE", "Android AudioRecord initialization failed")
        return
      }

      audioRecord = recorder
      recording.set(true)
      recorder.startRecording()
      recordingThread = thread(name = "TencentAsrPcmRecorder") {
        capture(recorder)
      }
      promise.resolve(null)
    } catch (error: Exception) {
      recording.set(false)
      releaseRecorder()
      promise.reject("RECORDER_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    stopInternal()
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by NativeEventEmitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by NativeEventEmitter.
  }

  private fun capture(recorder: AudioRecord) {
    val frame = ByteArray(FRAME_BYTES)
    var offset = 0
    try {
      while (recording.get()) {
        val count = recorder.read(frame, offset, FRAME_BYTES - offset)
        if (count < 0) {
          emitError("AudioRecord read failed: $count")
          break
        }
        offset += count
        if (offset == FRAME_BYTES) {
          emit(EVENT_AUDIO_FRAME, Base64.encodeToString(frame, Base64.NO_WRAP))
          offset = 0
        }
      }
    } catch (error: Exception) {
      if (recording.get()) emitError(error.message ?: "Audio capture failed")
    } finally {
      recording.set(false)
      releaseRecorder()
    }
  }

  private fun stopInternal() {
    recording.set(false)
    try {
      audioRecord?.stop()
    } catch (_: IllegalStateException) {
      // Recorder may already be stopped.
    }
    recordingThread?.interrupt()
    recordingThread = null
    releaseRecorder()
  }

  @Synchronized
  private fun releaseRecorder() {
    audioRecord?.release()
    audioRecord = null
  }

  private fun emitError(message: String) {
    emit(EVENT_RECORDER_ERROR, message)
  }

  private fun emit(eventName: String, value: String) {
    if (!reactContext.hasActiveReactInstance()) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, value)
  }

  override fun invalidate() {
    stopInternal()
    super.invalidate()
  }
}
