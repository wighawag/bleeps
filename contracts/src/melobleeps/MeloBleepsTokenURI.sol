// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Strings.sol";

/* solhint-disable quotes */

contract MeloBleepsTokenURI {
    using Strings for uint256;
    using Strings for uint160;
    using Strings for uint96;
    string internal constant TABLE_ENCODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    bytes internal constant FREQUENCIES =
        hex"00198d001b12001cae001e6200203100221b00242200264800288f002af8002d8600303b00331900362300395b003cc4004061004435004844004c9000511d0055f0005b0c006076006633006c460072b60079890080c300886b00908700992000a23a00abe000b61800c0ec00cc6500d88d00e56d00f3110101850110d601210f01323f0144750157c0016c310181d90198ca01b11901cada01e62302030b0221ab02421e02647e0288ea02af8002d8620303b10331940362320395b403cc4604061604435704843c04c8fc0511d4055f0005b0c306076306632906c464072b6707988b080c2c0886ad0908770991f90a23a80abe000b61860c0ec5";

    // settings for sound quality
    uint256 internal constant SAMPLE_RATE = 11000;
    uint256 internal constant BYTES_PER_SAMPLE = 1;

    // constants for ensuring enough precision when computing values
    int256 internal constant ONE = 1000000;
    int256 internal constant HUNDRED = 100000000;
    int256 internal constant TWO = 2000000; // 2 * ONE;
    int256 internal constant FOUR = 4000000;
    int256 internal constant EIGHT = 8000000;
    int256 internal constant HALF = 500000; // ONE/ 2;
    int256 internal constant ZERO7 = 700000; // (ONE * 7) / 10;
    int256 internal constant ZERO3 = 300000; // (ONE * 3) / 10;
    int256 internal constant ZERO1 = 100000; //(ONE * 1) / 10;
    int256 internal constant ZERO3125 = 312500; //( ONE * 3125) / 10000;
    int256 internal constant ZERO8750 = 875000; // (ONE * 8750) / 10000;
    int256 internal constant MINUS_ONE = -1000000; //; -ONE;
    int256 internal constant MIN_VALUE = MINUS_ONE + 1;
    int256 internal constant MAX_VALUE = ONE - 1;

    function contractURI(address receiver, uint96 per10Thousands) external pure returns (string memory) {
        return
            string(
                bytes.concat(
                    'data:application/json,{"name":"Bleeps%20Melodies","description":"Bleeps%20Melodies%20are%20the%20first%20composed%20sounds%20fully%20generated%20on-chain%20with%20zero%20externalities.%20Each%20Bleep%20gives%20one%20vote%20in%20the%20Bleeps%20DAO.%20They%20can%20also%20be%20combined%20to%20create%20Onchain%20Melodies.","image":"data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6YmxhY2s7Ij48ZyBpZD0iU3ltYm9scyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgZmlsbD0iI0RBQjg5NCI+DQo8cGF0aCBkPSJNMjY1Ljk0LDQwNCBDMjY3LjA5Miw0MDQgMjY4LjIxNCw0MDMuODU2IDI2OS4zMDYsNDAzLjU2OCBDMjcwLjM5OCw0MDMuMjggMjcxLjM3LDQwMi44MzYgMjcyLjIyMiw0MDIuMjM2IEMyNzMuMDc0LDQwMS42MzYgMjczLjc1Miw0MDAuODYyIDI3NC4yNTYsMzk5LjkxNCBDMjc0Ljc2LDM5OC45NjYgMjc1LjAxMiwzOTcuODQ0IDI3NS4wMTIsMzk2LjU0OCBDMjc1LjAxMiwzOTQuOTQgMjc0LjYyMiwzOTMuNTY2IDI3My44NDIsMzkyLjQyNiBDMjczLjA2MiwzOTEuMjg2IDI3MS44OCwzOTAuNDg4IDI3MC4yOTYsMzkwLjAzMiBDMjcxLjQ0OCwzODkuNDggMjcyLjMxOCwzODguNzcyIDI3Mi45MDYsMzg3LjkwOCBDMjczLjQ5NCwzODcuMDQ0IDI3My43ODgsMzg1Ljk2NCAyNzMuNzg4LDM4NC42NjggQzI3My43ODgsMzgzLjQ2OCAyNzMuNTksMzgyLjQ2IDI3My4xOTQsMzgxLjY0NCBDMjcyLjc5OCwzODAuODI4IDI3Mi4yNCwzODAuMTc0IDI3MS41MiwzNzkuNjgyIEMyNzAuOCwzNzkuMTkgMjY5LjkzNiwzNzguODM2IDI2OC45MjgsMzc4LjYyIEMyNjcuOTIsMzc4LjQwNCAyNjYuODA0LDM3OC4yOTYgMjY1LjU4LDM3OC4yOTYgTDI1My40ODQsMzc4LjI5NiBMMjUzLjQ4NCw0MDQgTDI2NS45NCw0MDQgWiBNMjY0Ljg2LDM4OC43IEwyNTkuMTM2LDM4OC43IEwyNTkuMTM2LDM4Mi42ODggTDI2NC40MjgsMzgyLjY4OCBDMjY0LjkzMiwzODIuNjg4IDI2NS40MTgsMzgyLjczIDI2NS44ODYsMzgyLjgxNCBDMjY2LjM1NCwzODIuODk4IDI2Ni43NjgsMzgzLjA0OCAyNjcuMTI4LDM4My4yNjQgQzI2Ny40ODgsMzgzLjQ4IDI2Ny43NzYsMzgzLjc4IDI2Ny45OTIsMzg0LjE2NCBDMjY4LjIwOCwzODQuNTQ4IDI2OC4zMTYsMzg1LjA0IDI2OC4zMTYsMzg1LjY0IEMyNjguMzE2LDM4Ni43MiAyNjcuOTkyLDM4Ny41IDI2Ny4zNDQsMzg3Ljk4IEMyNjYuNjk2LDM4OC40NiAyNjUuODY4LDM4OC43IDI2NC44NiwzODguNyBaIE0yNjUuMTg0LDM5OS42MDggTDI1OS4xMzYsMzk5LjYwOCBMMjU5LjEzNiwzOTIuNTUyIEwyNjUuMjkyLDM5Mi41NTIgQzI2Ni41MTYsMzkyLjU1MiAyNjcuNSwzOTIuODM0IDI2OC4yNDQsMzkzLjM5OCBDMjY4Ljk4OCwzOTMuOTYyIDI2OS4zNiwzOTQuOTA0IDI2OS4zNiwzOTYuMjI0IEMyNjkuMzYsMzk2Ljg5NiAyNjkuMjQ2LDM5Ny40NDggMjY5LjAxOCwzOTcuODggQzI2OC43OSwzOTguMzEyIDI2OC40ODQsMzk4LjY1NCAyNjguMSwzOTguOTA2IEMyNjcuNzE2LDM5OS4xNTggMjY3LjI3MiwzOTkuMzM4IDI2Ni43NjgsMzk5LjQ0NiBDMjY2LjI2NCwzOTkuNTU0IDI2NS43MzYsMzk5LjYwOCAyNjUuMTg0LDM5OS42MDggWiBNMzExLjAwOCw0MDQgTDMxMS4wMDgsMzk5LjI0OCBMMjk4LjQ4LDM5OS4yNDggTDI5OC40OCwzNzguMjk2IEwyOTIuODI4LDM3OC4yOTYgTDI5Mi44MjgsNDA0IEwzMTEuMDA4LDQwNCBaIE0zNDcuNjg4LDQwNCBMMzQ3LjY4OCwzOTkuMjQ4IEwzMzMuODI4LDM5OS4yNDggTDMzMy44MjgsMzkyLjk0OCBMMzQ2LjI4NCwzOTIuOTQ4IEwzNDYuMjg0LDM4OC41NTYgTDMzMy44MjgsMzg4LjU1NiBMMzMzLjgyOCwzODMuMDQ4IEwzNDcuNCwzODMuMDQ4IEwzNDcuNCwzNzguMjk2IEwzMjguMTc2LDM3OC4yOTYgTDMyOC4xNzYsNDA0IEwzNDcuNjg4LDQwNCBaIE0zODUuMDE2LDQwNCBMMzg1LjAxNiwzOTkuMjQ4IEwzNzEuMTU2LDM5OS4yNDggTDM3MS4xNTYsMzkyLjk0OCBMMzgzLjYxMiwzOTIuOTQ4IEwzODMuNjEyLDM4OC41NTYgTDM3MS4xNTYsMzg4LjU1NiBMMzcxLjE1NiwzODMuMDQ4IEwzODQuNzI4LDM4My4wNDggTDM4NC43MjgsMzc4LjI5NiBMMzY1LjUwNCwzNzguMjk2IEwzNjUuNTA0LDQwNCBMMzg1LjAxNiw0MDQgWiBNNDA4LjQ4NCw0MDQgTDQwOC40ODQsMzk0Ljc4NCBMNDE0LjQyNCwzOTQuNzg0IEM0MTYuMDMyLDM5NC43ODQgNDE3LjQsMzk0LjU1IDQxOC41MjgsMzk0LjA4MiBDNDE5LjY1NiwzOTMuNjE0IDQyMC41NzQsMzkyLjk5NiA0MjEuMjgyLDM5Mi4yMjggQzQyMS45OSwzOTEuNDYgNDIyLjUwNiwzOTAuNTc4IDQyMi44MywzODkuNTgyIEM0MjMuMTU0LDM4OC41ODYgNDIzLjMxNiwzODcuNTcyIDQyMy4zMTYsMzg2LjU0IEM0MjMuMzE2LDM4NS40ODQgNDIzLjE1NCwzODQuNDY0IDQyMi44MywzODMuNDggQzQyMi41MDYsMzgyLjQ5NiA0MjEuOTksMzgxLjYyIDQyMS4yODIsMzgwLjg1MiBDNDIwLjU3NCwzODAuMDg0IDQxOS42NTYsMzc5LjQ2NiA0MTguNTI4LDM3OC45OTggQzQxNy40LDM3OC41MyA0MTYuMDMyLDM3OC4yOTYgNDE0LjQyNCwzNzguMjk2IEw0MDIuODMyLDM3OC4yOTYgTDQwMi44MzIsNDA0IEw0MDguNDg0LDQwNCBaIE00MTIuODc2LDM5MC4zOTIgTDQwOC40ODQsMzkwLjM5MiBMNDA4LjQ4NCwzODIuNjg4IEw0MTIuODc2LDM4Mi42ODggQzQxMy41MjQsMzgyLjY4OCA0MTQuMTQ4LDM4Mi43MzYgNDE0Ljc0OCwzODIuODMyIEM0MTUuMzQ4LDM4Mi45MjggNDE1Ljg3NiwzODMuMTE0IDQxNi4zMzIsMzgzLjM5IEM0MTYuNzg4LDM4My42NjYgNDE3LjE1NCwzODQuMDU2IDQxNy40MywzODQuNTYgQzQxNy43MDYsMzg1LjA2NCA0MTcuODQ0LDM4NS43MjQgNDE3Ljg0NCwzODYuNTQgQzQxNy44NDQsMzg3LjM1NiA0MTcuNzA2LDM4OC4wMTYgNDE3LjQzLDM4OC41MiBDNDE3LjE1NCwzODkuMDI0IDQxNi43ODgsMzg5LjQxNCA0MTYuMzMyLDM4OS42OSBDNDE1Ljg3NiwzODkuOTY2IDQxNS4zNDgsMzkwLjE1MiA0MTQuNzQ4LDM5MC4yNDggQzQxNC4xNDgsMzkwLjM0NCA0MTMuNTI0LDM5MC4zOTIgNDEyLjg3NiwzOTAuMzkyIFogTTQ1MC4xNjgsNDA0LjU3NiBDNDUxLjkyLDQwNC41NzYgNDUzLjQ2Miw0MDQuMzcyIDQ1NC43OTQsNDAzLjk2NCBDNDU2LjEyNiw0MDMuNTU2IDQ1Ny4yNDIsNDAyLjk4NiA0NTguMTQyLDQwMi4yNTQgQzQ1OS4wNDIsNDAxLjUyMiA0NTkuNzIsNDAwLjY1MiA0NjAuMTc2LDM5OS42NDQgQzQ2MC42MzIsMzk4LjYzNiA0NjAuODYsMzk3LjU0NCA0NjAuODYsMzk2LjM2OCBDNDYwLjg2LDM5NC45MjggNDYwLjU1NCwzOTMuNzQ2IDQ1OS45NDIsMzkyLjgyMiBDNDU5LjMzLDM5MS44OTggNDU4LjYwNCwzOTEuMTYgNDU3Ljc2NCwzOTAuNjA4IEM0NTYuOTI0LDM5MC4wNTYgNDU2LjA3OCwzODkuNjU0IDQ1NS4yMjYsMzg5LjQwMiBDNDU0LjM3NCwzODkuMTUgNDUzLjcwOCwzODguOTc2IDQ1My4yMjgsMzg4Ljg4IEM0NTEuNjIsMzg4LjQ3MiA0NTAuMzE4LDM4OC4xMzYgNDQ5LjMyMiwzODcuODcyIEM0NDguMzI2LDM4Ny42MDggNDQ3LjU0NiwzODcuMzQ0IDQ0Ni45ODIsMzg3LjA4IEM0NDYuNDE4LDM4Ni44MTYgNDQ2LjA0LDM4Ni41MjggNDQ1Ljg0OCwzODYuMjE2IEM0NDUuNjU2LDM4NS45MDQgNDQ1LjU2LDM4NS40OTYgNDQ1LjU2LDM4NC45OTIgQzQ0NS41NiwzODQuNDQgNDQ1LjY4LDM4My45ODQgNDQ1LjkyLDM4My42MjQgQzQ0Ni4xNiwzODMuMjY0IDQ0Ni40NjYsMzgyLjk2NCA0NDYuODM4LDM4Mi43MjQgQzQ0Ny4yMSwzODIuNDg0IDQ0Ny42MjQsMzgyLjMxNiA0NDguMDgsMzgyLjIyIEM0NDguNTM2LDM4Mi4xMjQgNDQ4Ljk5MiwzODIuMDc2IDQ0OS40NDgsMzgyLjA3NiBDNDUwLjE0NCwzODIuMDc2IDQ1MC43ODYsMzgyLjEzNiA0NTEuMzc0LDM4Mi4yNTYgQzQ1MS45NjIsMzgyLjM3NiA0NTIuNDg0LDM4Mi41OCA0NTIuOTQsMzgyLjg2OCBDNDUzLjM5NiwzODMuMTU2IDQ1My43NjIsMzgzLjU1MiA0NTQuMDM4LDM4NC4wNTYgQzQ1NC4zMTQsMzg0LjU2IDQ1NC40NzYsMzg1LjE5NiA0NTQuNTI0LDM4NS45NjQgTDQ1OS45OTYsMzg1Ljk2NCBDNDU5Ljk5NiwzODQuNDc2IDQ1OS43MTQsMzgzLjIxIDQ1OS4xNSwzODIuMTY2IEM0NTguNTg2LDM4MS4xMjIgNDU3LjgyNCwzODAuMjY0IDQ1Ni44NjQsMzc5LjU5MiBDNDU1LjkwNCwzNzguOTIgNDU0LjgwNiwzNzguNDM0IDQ1My41NywzNzguMTM0IEM0NTIuMzM0LDM3Ny44MzQgNDUxLjA0NCwzNzcuNjg0IDQ0OS43LDM3Ny42ODQgQzQ0OC41NDgsMzc3LjY4NCA0NDcuMzk2LDM3Ny44NCA0NDYuMjQ0LDM3OC4xNTIgQzQ0NS4wOTIsMzc4LjQ2NCA0NDQuMDYsMzc4Ljk0NCA0NDMuMTQ4LDM3OS41OTIgQzQ0Mi4yMzYsMzgwLjI0IDQ0MS40OTgsMzgxLjA1IDQ0MC45MzQsMzgyLjAyMiBDNDQwLjM3LDM4Mi45OTQgNDQwLjA4OCwzODQuMTQgNDQwLjA4OCwzODUuNDYgQzQ0MC4wODgsMzg2LjYzNiA0NDAuMzEsMzg3LjYzOCA0NDAuNzU0LDM4OC40NjYgQzQ0MS4xOTgsMzg5LjI5NCA0NDEuNzgsMzg5Ljk4NCA0NDIuNSwzOTAuNTM2IEM0NDMuMjIsMzkxLjA4OCA0NDQuMDM2LDM5MS41MzggNDQ0Ljk0OCwzOTEuODg2IEM0NDUuODYsMzkyLjIzNCA0NDYuNzk2LDM5Mi41MjggNDQ3Ljc1NiwzOTIuNzY4IEM0NDguNjkyLDM5My4wMzIgNDQ5LjYxNiwzOTMuMjcyIDQ1MC41MjgsMzkzLjQ4OCBDNDUxLjQ0LDM5My43MDQgNDUyLjI1NiwzOTMuOTU2IDQ1Mi45NzYsMzk0LjI0NCBDNDUzLjY5NiwzOTQuNTMyIDQ1NC4yNzgsMzk0Ljg5MiA0NTQuNzIyLDM5NS4zMjQgQzQ1NS4xNjYsMzk1Ljc1NiA0NTUuMzg4LDM5Ni4zMiA0NTUuMzg4LDM5Ny4wMTYgQzQ1NS4zODgsMzk3LjY2NCA0NTUuMjIsMzk4LjE5OCA0NTQuODg0LDM5OC42MTggQzQ1NC41NDgsMzk5LjAzOCA0NTQuMTI4LDM5OS4zNjggNDUzLjYyNCwzOTkuNjA4IEM0NTMuMTIsMzk5Ljg0OCA0NTIuNTgsNDAwLjAxIDQ1Mi4wMDQsNDAwLjA5NCBDNDUxLjQyOCw0MDAuMTc4IDQ1MC44ODgsNDAwLjIyIDQ1MC4zODQsNDAwLjIyIEM0NDkuNjQsNDAwLjIyIDQ0OC45Miw0MDAuMTMgNDQ4LjIyNCwzOTkuOTUgQzQ0Ny41MjgsMzk5Ljc3IDQ0Ni45MjIsMzk5LjQ5NCA0NDYuNDA2LDM5OS4xMjIgQzQ0NS44OSwzOTguNzUgNDQ1LjQ3NiwzOTguMjY0IDQ0NS4xNjQsMzk3LjY2NCBDNDQ0Ljg1MiwzOTcuMDY0IDQ0NC42OTYsMzk2LjMzMiA0NDQuNjk2LDM5NS40NjggTDQzOS4yMjQsMzk1LjQ2OCBDNDM5LjIsMzk3LjA1MiA0MzkuNDg4LDM5OC40MiA0NDAuMDg4LDM5OS41NzIgQzQ0MC42ODgsNDAwLjcyNCA0NDEuNDk4LDQwMS42NzIgNDQyLjUxOCw0MDIuNDE2IEM0NDMuNTM4LDQwMy4xNiA0NDQuNzE0LDQwMy43MDYgNDQ2LjA0Niw0MDQuMDU0IEM0NDcuMzc4LDQwNC40MDIgNDQ4Ljc1Miw0MDQuNTc2IDQ1MC4xNjgsNDA0LjU3NiBaIiBpZD0iQkxFRVBTIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjwvcGF0aD4NCjxnIGlkPSJHcm91cCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjUxLjAwMDAwMCwgMTQzLjAwMDAwMCkiPg0KPHN0eWxlPg0KLlp7YW5pbWF0aW9uOnB1bHNlIDFzIGluZmluaXRlO3RyYW5zZm9ybS1ib3g6IGZpbGwtYm94O3RyYW5zZm9ybS1vcmlnaW46IGNlbnRlcjt9DQojQXthbmltYXRpb24tZGVsYXk6LjE1czt9DQojQnthbmltYXRpb24tZGVsYXk6LjMwczt9DQojQ3thbmltYXRpb24tZGVsYXk6LjQ1czt9DQojRHthbmltYXRpb24tZGVsYXk6LjYwczt9DQojRXthbmltYXRpb24tZGVsYXk6Ljc1czt9DQojRnthbmltYXRpb24tZGVsYXk6Ljkwczt9DQojR3thbmltYXRpb24tZGVsYXk6MS4wNXM7fQ0KI0h7YW5pbWF0aW9uLWRlbGF5OjEuMjBzO30NCiNJe2FuaW1hdGlvbi1kZWxheToxLjM1czt9DQpAa2V5ZnJhbWVzIHB1bHNlIHswJXt0cmFuc2Zvcm06IHNjYWxlWSgxKTt0cmFuc2Zvcm0tb3JpZ2luOjUwJSA1MCU7fTUwJSB7dHJhbnNmb3JtOiBzY2FsZVkoLjcpO3RyYW5zZm9ybS1vcmlnaW46IDUwJSA1MCU7fTEwMCUge3RyYW5zZm9ybTogc2NhbGVZKDEpO3RyYW5zZm9ybS1vcmlnaW46IDUwJSA1MCU7fX0NCjwvc3R5bGU+DQo8cmVjdCBjbGFzcz0iWiIgaWQ9IkEiIHg9IjAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iODAiIHJ4PSIxMCI+PC9yZWN0Pg0KPHJlY3QgY2xhc3M9IloiIGlkPSJCIiB4PSIzOCIgeT0iMjQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNzIiIHJ4PSIxMCI+PC9yZWN0Pg0KPHJlY3QgY2xhc3M9IloiIGlkPSJDIiB4PSI3NiIgeT0iNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMDAiIHJ4PSIxMCI+PC9yZWN0Pg0KPHJlY3QgY2xhc3M9IloiIGlkPSJEIiB4PSIxMTQiIHk9IjYwIiB3aWR0aD0iMjAiIGhlaWdodD0iMTAwIiByeD0iMTAiPjwvcmVjdD4NCjxyZWN0IGNsYXNzPSJaIiBpZD0iRSIgeD0iMTUyIiB5PSIwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjIwIiByeD0iMTAiPjwvcmVjdD4NCjxyZWN0IGNsYXNzPSJaIiBpZD0iRiIgeD0iMTkwIiB5PSIzNSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1MCIgcng9IjEwIj48L3JlY3Q+DQo8L2c+DQo8cG9seWdvbiBpZD0iVHJpYW5nbGUiIHBvaW50cz0iMTIzIDEzMiAxOTUuMjEzMzMzIDI1MS4wOTAxNzggMTIzIDI5My43Mjk3NDggNTEgMjUxLjA5MDE3OCI+PC9wb2x5Z29uPjxwb2x5Z29uIGlkPSJUcmlhbmdsZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIzLjEwNjY2NywgMzE1LjM0NDYyNykgc2NhbGUoMSwgLTEpIHRyYW5zbGF0ZSgtMTIzLjEwNjY2NywgLTMxNS4zNDQ2MjcpICIgcG9pbnRzPSIxMjMgMjY0Ljk1OTUwNiAxOTUuMjEzMzMzIDM2NS43Mjk3NDggMTIzLjEwNjY2NyAzMjMuNDU2Mjg1IDUxIDM2NS43Mjk3NDgiPjwvcG9seWdvbj48L2c+PC9nPjwvc3ZnPg==","external_link":"https://bleeps.art","seller_fee_basis_points":',
                    bytes(per10Thousands.toString()),
                    ',"fee_recipient":"',
                    bytes(uint160(receiver).toHexString(20)),
                    '"}'
                )
            );
    }

    function tokenURI(
        bytes32 d1,
        bytes32 d2,
        uint8 speed,
        string calldata name
    ) external pure returns (string memory) {
        return _generateWav(d1, d2, speed, name);
    }

    function _prepareBuffer(bytes memory buffer, string memory name) internal pure returns (uint256) {
        bytes memory start = bytes.concat(
            'data:application/json,{"name":"',
            bytes(name),
            '","description":"Melody","external_url":"',
            "https://bleeps.art/melodies/%23id=",
            "\",\"image\":\"data:image/svg+xml,<svg viewBox='0 0 32 16' ><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' style='fill: rgb(219, 39, 119); font-size: 12px;'>",
            "hello",
            '</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPgqAAABAAgAZGF0YQAA'
        ); // missing 2 zero bytes
        uint256 len = start.length;
        uint256 src;
        uint256 dest;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            src := add(start, 0x20)
            dest := add(buffer, 0x20)
        }
        for (; len >= 32; len -= 32) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                mstore(dest, mload(src))
            }
            dest += 32;
            src += 32;
        }
        // TODO remove that step by ensuring the length is a multiple of 32 bytes
        uint256 mask = 256**(32 - len) - 1;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
        return start.length;
    }

    function _finishBuffer(
        bytes memory buffer,
        uint256 resultPtr,
        uint256 tablePtr,
        uint256 numSamplesPlusOne,
        uint256 startLength
    ) internal pure {
        // write ends + size in buffer
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore8(resultPtr, 0x22) // "
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, 0x7D) // }
            resultPtr := add(resultPtr, 1)
            mstore(buffer, sub(sub(resultPtr, buffer), 32))
        }

        // compute chnksize (TODO hardcode)
        uint256 filesizeMinus8 = ((numSamplesPlusOne - 1) + 44) - 8;
        uint256 chunkSize = filesizeMinus8 + 8 - 44;

        // filesize // 46 00 00
        resultPtr = startLength + 32 - 52;
        assembly {
            resultPtr := add(buffer, resultPtr)
            let v := shl(40, 0x46)
            v := add(v, shl(32, and(filesizeMinus8, 255)))
            v := add(v, shl(24, and(shr(8, filesizeMinus8), 255)))
            v := add(v, shl(16, and(shr(16, filesizeMinus8), 255)))
            v := add(v, shl(8, and(shr(24, filesizeMinus8), 255)))
            v := add(v, 0x57)
            // write 8 characters
            mstore8(resultPtr, mload(add(tablePtr, and(shr(42, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(36, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(30, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(24, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
        }

        // // // chunksize // 61 00 00
        resultPtr = startLength + 32 - 4;
        assembly {
            resultPtr := add(buffer, resultPtr)
            let v := shl(40, 0x61)
            v := add(v, shl(32, and(chunkSize, 255)))
            v := add(v, shl(24, and(shr(8, chunkSize), 255)))
            v := add(v, shl(16, and(shr(16, chunkSize), 255)))
            v := add(v, shl(8, and(shr(24, chunkSize), 255)))
            v := add(v, 0x57)
            // write 8 characters
            mstore8(resultPtr, mload(add(tablePtr, and(shr(42, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(36, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(30, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(24, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
            resultPtr := add(resultPtr, 1)
            mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
        }
    }

    function _generateWav(
        bytes32 d1,
        bytes32 d2,
        uint8 speed,
        string memory name
    ) internal pure returns (string memory) {
        bytes memory buffer = new bytes(500000);
        uint256 startLength = _prepareBuffer(buffer, name);

        string memory table = TABLE_ENCODE;
        uint256 tablePtr;
        uint256 resultPtr = startLength + 32;
        assembly {
            // prepare the lookup table
            tablePtr := add(table, 1)

            // set write pointer
            resultPtr := add(buffer, resultPtr)
        }

        bytes memory freqTable = FREQUENCIES;

        uint256 numSamplesPlusOne = (3 * (((32 * (61 * uint256(speed) * SAMPLE_RATE)) / (7350)) + 1)) / 3; //3 * 3 * ((22050 + 3) / 3); // 16 = speed

        uint256[] memory noise_handler = new uint256[](4);

        // console.log("numSamplesPlusOne %i", numSamplesPlusOne);
        int256 pos = 0;

        for (uint256 i = 0; i < numSamplesPlusOne; i += 3) {
            assembly {
                function abs(a) -> b {
                    b := a
                    if slt(b, 0) {
                        b := sub(0, b)
                    }
                }

                let meloIndex := div(i, div(numSamplesPlusOne, 32)) // TODO numSamples
                let data := d1
                if gt(meloIndex, 15) {
                    data := d2
                    meloIndex := sub(meloIndex, 16)
                    if gt(meloIndex, 15) {
                        meloIndex := 15
                    }
                }
                data := and(shr(mul(sub(15, meloIndex), 16), data), 0xFFFF) // sub(15) is to divide the data in 2
                let note := and(data, 0x3F)
                let instr := and(shr(6, data), 0x0F)
                let vol := mul(and(shr(10, data), 0x07), 100)

                let posStep := div(
                    mul(and(shr(232, mload(add(freqTable, add(32, mul(note, 3))))), 0xFFFFFF), 10000),
                    SAMPLE_RATE
                )

                let v := 0
                for {
                    let c := 0
                } lt(c, 3) {
                    c := add(c, 1)
                } {
                    let intValue := 0
                    // skip first value as it pertain to the double bytes for chunksize
                    if gt(pos, 0) {
                        // tri
                        if eq(instr, 0) {
                            // triangle

                            intValue := abs(sub(mul(mod(pos, ONE), 2), ONE))
                            intValue := sub(mul(intValue, 2), ONE)
                            intValue := sdiv(intValue, 2)
                        }
                        if eq(instr, 1) {
                            // tilted saw (uneven_tri)
                            let tmp := smod(pos, ONE)
                            if slt(tmp, ZERO8750) {
                                intValue := sdiv(mul(tmp, 16), 7)
                            }
                            if sgt(tmp, ZERO8750) {
                                intValue := mul(sub(ONE, tmp), 16)
                            }
                            if eq(tmp, ZERO8750) {
                                intValue := mul(sub(ONE, tmp), 16)
                            }
                            intValue := sdiv(mul(sub(intValue, ONE), HALF), ONE)
                        }
                        if eq(instr, 2) {
                            // saw
                            intValue := sdiv(mul(sub(smod(pos, ONE), HALF), ZERO7), ONE)
                        }
                        if eq(instr, 3) {
                            // square
                            let tmp := smod(pos, ONE)
                            intValue := MINUS_ONE
                            if lt(tmp, HALF) {
                                intValue := ONE
                            }
                            intValue := sdiv(intValue, 4)
                        }
                        if eq(instr, 4) {
                            // pulse
                            let tmp := smod(pos, ONE)
                            intValue := MINUS_ONE
                            if lt(tmp, ZERO3125) {
                                intValue := ONE
                            }
                            intValue := sdiv(intValue, 4)
                        }
                        if eq(instr, 5) {
                            // organ (tri2)
                            intValue := mul(pos, 4)
                            intValue := sdiv(
                                mul(
                                    sub(
                                        sub(
                                            add(
                                                abs(sub(smod(intValue, TWO), ONE)),
                                                sdiv(
                                                    sub(abs(sub(smod(sdiv(mul(intValue, HALF), ONE), TWO), ONE)), HALF),
                                                    2
                                                )
                                            ),
                                            HALF
                                        ),
                                        ZERO1
                                    ),
                                    HALF
                                ),
                                ONE
                            )
                        }
                        if eq(instr, 6) {
                            // phaser (detuned_tri)
                            intValue := mul(pos, 2)
                            intValue := add(
                                sub(abs(sub(smod(intValue, TWO), ONE)), HALF),
                                sub(
                                    sdiv(sub(abs(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE)), HALF), 2),
                                    sdiv(ONE, 4)
                                )
                            )
                        }
                        if eq(instr, 7) {
                            // noise
                            let rand := mload(add(noise_handler, 32))
                            let lastx := mload(add(noise_handler, 64))
                            let sample := mload(add(noise_handler, 96))
                            let lsample := mload(add(noise_handler, 128))
                            rand := mod(add(mul(1103515245, rand), 12345), 0x80000000)
                            let scale := div(mul(sub(pos, lastx), FOUR), 160000)
                            lsample := sample
                            sample := sdiv(
                                mul(add(lsample, scale), sub(div(mul(rand, TWO), 0x80000000), ONE)),
                                add(ONE, scale)
                            )
                            lastx := pos
                            intValue := sdiv(
                                mul(sdiv(mul(add(lsample, sample), 4), 3), sub(175, mul(scale, 100))),
                                HUNDRED
                            )
                            if slt(intValue, MINUS_ONE) {
                                intValue := MINUS_ONE
                            }
                            if sgt(intValue, ONE) {
                                intValue := ONE
                            }
                            intValue := sdiv(mul(intValue, 5), 10)
                            mstore(add(noise_handler, 32), rand)
                            mstore(add(noise_handler, 64), lastx)
                            mstore(add(noise_handler, 96), sample)
                            mstore(add(noise_handler, 128), lsample)
                        }
                        if eq(instr, 8) {
                            intValue := mul(pos, 2)
                            intValue := sdiv(
                                mul(
                                    add(
                                        sub(sub(smod(intValue, TWO), ONE), HALF),
                                        sub(
                                            sdiv(sub(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE), HALF), 2),
                                            sdiv(ONE, 4)
                                        )
                                    ),
                                    5
                                ),
                                7
                            )
                        }
                        intValue := sdiv(mul(intValue, vol), 700)
                        intValue := add(sdiv(mul(intValue, 256), TWO), 128)
                    }
                    v := add(v, shl(sub(16, mul(c, 8)), intValue))
                    pos := add(pos, posStep)
                }

                // write 4 characters
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, v), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, v), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, v), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(v, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
        }

        _finishBuffer(buffer, resultPtr, tablePtr, numSamplesPlusOne, startLength);

        return string(buffer);
    }
}
