#pragma once

static const PIXELFORMATDESCRIPTOR pfd = {
	sizeof(PIXELFORMATDESCRIPTOR),
	1,
	PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER,
	PFD_TYPE_RGBA,
	32,
	0,
	0,
	0,
	0,
	0,
	0,
	8,
	0,
	0,
	0,
	0,
	0,
	0,
	32,
	0,
	0,
	PFD_MAIN_PLANE,
	0,
	0,
	0,
	0,
};

static HWND hwnd;
