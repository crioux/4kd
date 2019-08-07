#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>

#include <demo-data.hpp>
#include <demo-gl.hpp>

#include "definitions.hpp"

#include "debug.hpp"
#include "window.hpp"

#ifdef HAS_HOOKS
#include <hooks.hpp>
#endif

void main()
{
#ifndef FORCE_RESOLUTION
	int resolutionWidth = GetSystemMetrics(SM_CXSCREEN);
	int resolutionHeight = GetSystemMetrics(SM_CYSCREEN);

#ifdef SCALE_RESOLUTION
	resolutionWidth *= SCALE_RESOLUTION;
	resolutionHeight *= SCALE_RESOLUTION;
#endif

#ifdef uniformResolutionWidth
	uniformResolutionWidth = (float)resolutionWidth;
#endif

#ifdef uniformResolutionHeight
	uniformResolutionHeight = (float)resolutionHeight;
#endif

#endif

	auto hwnd = CreateWindow("static", NULL, WS_POPUP | WS_VISIBLE, 0, 0, resolutionWidth, resolutionHeight, NULL, NULL, NULL, 0);
	auto hdc = GetDC(hwnd);
	SetPixelFormat(hdc, ChoosePixelFormat(hdc, &pfd), &pfd);
	wglMakeCurrent(hdc, wglCreateContext(hdc));
	ShowCursor(FALSE);

	// Display a black screen while loading.
	wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);

	for (auto i = 0; i < GL_EXT_FUNCTION_COUNT; ++i)
	{
		glExtFunctions[i] = wglGetProcAddress(glExtFunctionNames[i]);
	}

#ifdef DEBUG
	debugHwnd = hwnd;

	// Display Opengl info in console.
	printf("OpenGL version: %s\n", (char *)glGetString(GL_VERSION));
	// printf("OpenGL extensions: %s\n\n", (char *)glGetString(GL_EXTENSIONS));

	//TODO : here we set a callback function for GL to use when an error is encountered. Does not seem to work !
	glEnable(GL_DEBUG_OUTPUT);
	glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
	glDebugMessageCallback(showDebugMessageFromOpenGL, NULL);
	glDebugMessageControl(
		GL_DONT_CARE,
		GL_DONT_CARE,
		GL_DONT_CARE,
		0,
		0,
		true);
#endif

#if PASSES == 1
	GLint program = glCreateProgram();

#ifdef HAS_SHADER_PASS_0_VERTEX_CODE
	const char *vertexShaderSources[] = {
#ifdef HAS_SHADER_PROLOG_CODE
		shaderPrologCode,
#endif
#ifdef HAS_SHADER_VERTEX_SPECIFIC_CODE
		shaderVertexSpecificCode,
#endif
#ifdef HAS_SHADER_COMMON_CODE
		shaderCommonCode,
#endif
		shaderPassCodes[0],
	};

	GLint vertexShader = glCreateShader(GL_VERTEX_SHADER);
	glShaderSource(vertexShader, sizeof(vertexShaderSources) / sizeof(vertexShaderSources[0]), vertexShaderSources, 0);
	glCompileShader(vertexShader);
	checkShaderCompilation(vertexShader);
	glAttachShader(program, vertexShader);
#endif

#ifdef HAS_SHADER_PASS_0_FRAGMENT_CODE
	const char *fragmentShaderSources[] = {
#ifdef HAS_SHADER_PROLOG_CODE
		shaderPrologCode,
#endif
#ifdef HAS_SHADER_FRAGMENT_SPECIFIC_CODE
		shaderFragmentSpecificCode,
#endif
#ifdef HAS_SHADER_COMMON_CODE
		shaderCommonCode,
#endif
		shaderPassCodes[1],
	};

	GLint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
	glShaderSource(fragmentShader, sizeof(fragmentShaderSources) / sizeof(fragmentShaderSources[0]), fragmentShaderSources, 0);
	glCompileShader(fragmentShader);
	checkShaderCompilation(fragmentShader);
	glAttachShader(program, fragmentShader);
#endif

	glLinkProgram(program);
	glUseProgram(program);

#else
#error Not implemented.

#endif

#ifdef HAS_HOOKS
	initialization();
#endif

#ifdef BUFFERS
	//As we use 2 textures for each buffer for each buffer, "swapped" will tell which texture to render, changes at each frame
	//dualbuffering prevents reading and writing to the same render target
	bool swapped = false; //initilization costs 13 byte :(

	//Here we create textures, you can change the size of textures, filtering, add mipmaps, to suit your need
	GLuint textureID[BUFFERS * 2];
	glGenTextures(BUFFERS * 2, textureID);

	for (int i = 0; i < BUFFERS * 2; i++)
	{
		glBindTexture(GL_TEXTURE_2D, textureID[i]);
		glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, width, height, 0, GL_RGBA, GL_FLOAT, NULL);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
		//glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
	}

	//Only one framebuffer to save line of codes, we change the render targets for each buffer in the rendering loop
#endif

#if defined(AUDIO_TEXTURE) || defined(BUFFERS)
	unsigned int fbo;
	glGenFramebuffers(1, &fbo);
#endif

#ifdef DEBUG
	//this displays the indices for each uniform, it helps if you want to hardcode indices in the render loop to save line of code for release version
	printf("uniform id for _ : %ld\n", glGetUniformLocation(program, "_"));
	printf("uniform id for PASSINDEX : %ld\n", glGetUniformLocation(program, "PASSINDEX"));
	printf("uniform id for b0 : %ld\n", glGetUniformLocation(program, "b0"));
	printf("uniform id for b1 : %ld\n", glGetUniformLocation(program, "b1"));
	printf("uniform id for b2 : %ld\n", glGetUniformLocation(program, "b2"));
#endif

#ifdef AUDIO_TEXTURE
	glViewport(0, 0, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE);
	glBindFramebuffer(GL_FRAMEBUFFER, fbo);
	glUniform1i(0, -1); //int : (PASSINDEX)

	glBindTexture(GL_TEXTURE_2D, 1234);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE, 0, GL_RGBA, GL_FLOAT, NULL);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, 1234, 0);

	glRects(-1, -1, 1, 1);

	glReadPixels(0, 0, SOUND_TEXTURE_SIZE, SOUND_TEXTURE_SIZE, GL_RGBA, GL_FLOAT, soundBuffer);
	glViewport(0, 0, resolutionWidth, resolutionHeight);
	glFinish();

#ifdef DEBUG
	printf("Sound samples:\n");
	for (int i = 0; i < 10; i++)
	{
		printf("Sound sample %05d: %f / %f\n", i, soundBuffer[i * 2], soundBuffer[i * 2 + 1]);
	}
#endif
#endif

	audioStart();

	do
	{
		// Avoid 'not responding' system messages.
		PeekMessage(NULL, NULL, 0, 0, PM_REMOVE);

		float time = audioGetTime();

		// Set uniforms here.
		uniformTime = time;

		// Assume that the uniforms u[] will always be linked to locations [0-n].
		// Given that they are the only uniforms in the shader, it is likely to work on all drivers.
#ifdef BUFFERS
		glBindFramebuffer(GL_FRAMEBUFFER, fbo);

		for (auto i = 0; i < BUFFERS; i++)
		{
			//assign uniform value with hardcoded indices, use glGetUniformLocation is better but adds more line of codes
			//uniforms can be automatically removed if not used, thus removes/offsets all the following uniforms !
			glUniform1i(0, i);								//int : (PASSINDEX)
			glUniform1fv(1, FLOAT_UNIFORM_COUNT, uniforms); // floats "_[FLOAT_UNIFORM_COUNT]"
			glUniform1i(FLOAT_UNIFORM_COUNT + 1 + i, i);	// samplers b0, b1 ..

			glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureID[i * 2 + swapped], 0);
			glRects(-1, -1, 1, 1);

			glActiveTexture(GL_TEXTURE0 + i);
			glBindTexture(GL_TEXTURE_2D, textureID[i * 2 + swapped]);
		}

		swapped = !swapped;

		//blit last buffer (fbo) to the displayed frame buffer (0)
		//TODO : Blit can cost performances, better render the last buffer directly to the displayed framebuffer (0) ?
		glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0);
		glDrawBuffer(GL_BACK);

		glBlitFramebuffer(0, 0, width, height,
						  0, 0, width, height,
						  GL_COLOR_BUFFER_BIT,
						  GL_NEAREST);
#else
		glUniform1fv(0, FLOAT_UNIFORM_COUNT, floatUniforms);
#endif

#ifdef HAS_HOOKS
		render();
#else
		glRects(-1, -1, 1, 1);
#endif

		captureFrame();

		wglSwapLayerBuffers(hdc, WGL_SWAP_MAIN_PLANE);
	} while (
#ifdef CLOSE_WHEN_FINISHED
		!audioIsFinished() &&
#endif
		!GetAsyncKeyState(VK_ESCAPE));

	ExitProcess(0);
}
