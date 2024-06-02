from constant import ANSI_COLOR_MAP, ANSI_RESET_CODE


def printc(text, color):
    print(ANSI_COLOR_MAP[color] + text + ANSI_RESET_CODE)
