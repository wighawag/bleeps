// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

import "../interfaces/ITokenURI.sol";

/* solhint-disable quotes */

contract BleepsTokenURI is ITokenURI {
    string internal constant TABLE_ENCODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    bytes internal constant FREQUENCIES =
        hex"00198d001b12001cae001e6200203100221b00242200264800288f002af8002d8600303b00331900362300395b003cc4004061004435004844004c9000511d0055f0005b0c006076006633006c460072b60079890080c300886b00908700992000a23a00abe000b61800c0ec00cc6500d88d00e56d00f3110101850110d601210f01323f0144750157c0016c310181d90198ca01b11901cada01e62302030b0221ab02421e02647e0288ea02af8002d8620303b10331940362320395b403cc4604061604435704843c04c8fc0511d4055f0005b0c306076306632906c464072b6707988b080c2c0886ad0908770991f90a23a80abe000b61860c0ec5";

    string internal constant noteNames = "C C#D D#E F F#G G#A A#B ";
    // string internal constant instrumentNames = "TRIANGLE TILTED SAW  SAW SQUARE PULSE ORGAN PHASER NOISE FUNKY SAW";

    // settings for sound quality
    uint256 internal constant SAMPLE_RATE = 11000;
    uint256 internal constant BYTES_PER_SAMPLE = 1;

    // constants for ensuring enough precision when computing values
    int256 internal constant ONE = 1000000;
    int256 internal constant HUNDRED = 100000000;
    int256 internal constant TWO = 2000000; // 2 * ONE;
    int256 internal constant FOUR = 4000000;
    int256 internal constant HALF = 500000; // ONE/ 2;
    int256 internal constant ZERO7 = 700000; // (ONE * 7) / 10;
    int256 internal constant ZERO3 = 300000; // (ONE * 3) / 10;
    int256 internal constant ZERO1 = 100000; //(ONE * 1) / 10;
    int256 internal constant ZERO3125 = 312500; //( ONE * 3125) / 10000;
    int256 internal constant ZERO8750 = 875000; // (ONE * 8750) / 10000;
    int256 internal constant MINUS_ONE = -1000000; //; -ONE;
    int256 internal constant MIN_VALUE = MINUS_ONE + 1;
    int256 internal constant MAX_VALUE = ONE - 1;

    // svg from : https://codepen.io/rachelmcgrane/pen/VexWdX
    function contractURI() external pure returns (string memory) {
        return
            'data:application/json,{"name":"Bleeps","description":"The%20First%20Composable%20Sounds%20Fully%20Generated%20On-Chain%20With%20Zero%20Externalities","image":"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjx0aXRsZT5CbGVlcHMvTG9nbzwvdGl0bGU+PGcgaWQ9IlN5bWJvbHMiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGlkPSJCbGVlcHMvTG9nbyIgZmlsbD0iI0RBQjg5NCI+PHBhdGggZD0iTTI2NS45NCw0MDQgQzI2Ny4wOTIsNDA0IDI2OC4yMTQsNDAzLjg1NiAyNjkuMzA2LDQwMy41NjggQzI3MC4zOTgsNDAzLjI4IDI3MS4zNyw0MDIuODM2IDI3Mi4yMjIsNDAyLjIzNiBDMjczLjA3NCw0MDEuNjM2IDI3My43NTIsNDAwLjg2MiAyNzQuMjU2LDM5OS45MTQgQzI3NC43NiwzOTguOTY2IDI3NS4wMTIsMzk3Ljg0NCAyNzUuMDEyLDM5Ni41NDggQzI3NS4wMTIsMzk0Ljk0IDI3NC42MjIsMzkzLjU2NiAyNzMuODQyLDM5Mi40MjYgQzI3My4wNjIsMzkxLjI4NiAyNzEuODgsMzkwLjQ4OCAyNzAuMjk2LDM5MC4wMzIgQzI3MS40NDgsMzg5LjQ4IDI3Mi4zMTgsMzg4Ljc3MiAyNzIuOTA2LDM4Ny45MDggQzI3My40OTQsMzg3LjA0NCAyNzMuNzg4LDM4NS45NjQgMjczLjc4OCwzODQuNjY4IEMyNzMuNzg4LDM4My40NjggMjczLjU5LDM4Mi40NiAyNzMuMTk0LDM4MS42NDQgQzI3Mi43OTgsMzgwLjgyOCAyNzIuMjQsMzgwLjE3NCAyNzEuNTIsMzc5LjY4MiBDMjcwLjgsMzc5LjE5IDI2OS45MzYsMzc4LjgzNiAyNjguOTI4LDM3OC42MiBDMjY3LjkyLDM3OC40MDQgMjY2LjgwNCwzNzguMjk2IDI2NS41OCwzNzguMjk2IEwyNTMuNDg0LDM3OC4yOTYgTDI1My40ODQsNDA0IEwyNjUuOTQsNDA0IFogTTI2NC44NiwzODguNyBMMjU5LjEzNiwzODguNyBMMjU5LjEzNiwzODIuNjg4IEwyNjQuNDI4LDM4Mi42ODggQzI2NC45MzIsMzgyLjY4OCAyNjUuNDE4LDM4Mi43MyAyNjUuODg2LDM4Mi44MTQgQzI2Ni4zNTQsMzgyLjg5OCAyNjYuNzY4LDM4My4wNDggMjY3LjEyOCwzODMuMjY0IEMyNjcuNDg4LDM4My40OCAyNjcuNzc2LDM4My43OCAyNjcuOTkyLDM4NC4xNjQgQzI2OC4yMDgsMzg0LjU0OCAyNjguMzE2LDM4NS4wNCAyNjguMzE2LDM4NS42NCBDMjY4LjMxNiwzODYuNzIgMjY3Ljk5MiwzODcuNSAyNjcuMzQ0LDM4Ny45OCBDMjY2LjY5NiwzODguNDYgMjY1Ljg2OCwzODguNyAyNjQuODYsMzg4LjcgWiBNMjY1LjE4NCwzOTkuNjA4IEwyNTkuMTM2LDM5OS42MDggTDI1OS4xMzYsMzkyLjU1MiBMMjY1LjI5MiwzOTIuNTUyIEMyNjYuNTE2LDM5Mi41NTIgMjY3LjUsMzkyLjgzNCAyNjguMjQ0LDM5My4zOTggQzI2OC45ODgsMzkzLjk2MiAyNjkuMzYsMzk0LjkwNCAyNjkuMzYsMzk2LjIyNCBDMjY5LjM2LDM5Ni44OTYgMjY5LjI0NiwzOTcuNDQ4IDI2OS4wMTgsMzk3Ljg4IEMyNjguNzksMzk4LjMxMiAyNjguNDg0LDM5OC42NTQgMjY4LjEsMzk4LjkwNiBDMjY3LjcxNiwzOTkuMTU4IDI2Ny4yNzIsMzk5LjMzOCAyNjYuNzY4LDM5OS40NDYgQzI2Ni4yNjQsMzk5LjU1NCAyNjUuNzM2LDM5OS42MDggMjY1LjE4NCwzOTkuNjA4IFogTTMxMS4wMDgsNDA0IEwzMTEuMDA4LDM5OS4yNDggTDI5OC40OCwzOTkuMjQ4IEwyOTguNDgsMzc4LjI5NiBMMjkyLjgyOCwzNzguMjk2IEwyOTIuODI4LDQwNCBMMzExLjAwOCw0MDQgWiBNMzQ3LjY4OCw0MDQgTDM0Ny42ODgsMzk5LjI0OCBMMzMzLjgyOCwzOTkuMjQ4IEwzMzMuODI4LDM5Mi45NDggTDM0Ni4yODQsMzkyLjk0OCBMMzQ2LjI4NCwzODguNTU2IEwzMzMuODI4LDM4OC41NTYgTDMzMy44MjgsMzgzLjA0OCBMMzQ3LjQsMzgzLjA0OCBMMzQ3LjQsMzc4LjI5NiBMMzI4LjE3NiwzNzguMjk2IEwzMjguMTc2LDQwNCBMMzQ3LjY4OCw0MDQgWiBNMzg1LjAxNiw0MDQgTDM4NS4wMTYsMzk5LjI0OCBMMzcxLjE1NiwzOTkuMjQ4IEwzNzEuMTU2LDM5Mi45NDggTDM4My42MTIsMzkyLjk0OCBMMzgzLjYxMiwzODguNTU2IEwzNzEuMTU2LDM4OC41NTYgTDM3MS4xNTYsMzgzLjA0OCBMMzg0LjcyOCwzODMuMDQ4IEwzODQuNzI4LDM3OC4yOTYgTDM2NS41MDQsMzc4LjI5NiBMMzY1LjUwNCw0MDQgTDM4NS4wMTYsNDA0IFogTTQwOC40ODQsNDA0IEw0MDguNDg0LDM5NC43ODQgTDQxNC40MjQsMzk0Ljc4NCBDNDE2LjAzMiwzOTQuNzg0IDQxNy40LDM5NC41NSA0MTguNTI4LDM5NC4wODIgQzQxOS42NTYsMzkzLjYxNCA0MjAuNTc0LDM5Mi45OTYgNDIxLjI4MiwzOTIuMjI4IEM0MjEuOTksMzkxLjQ2IDQyMi41MDYsMzkwLjU3OCA0MjIuODMsMzg5LjU4MiBDNDIzLjE1NCwzODguNTg2IDQyMy4zMTYsMzg3LjU3MiA0MjMuMzE2LDM4Ni41NCBDNDIzLjMxNiwzODUuNDg0IDQyMy4xNTQsMzg0LjQ2NCA0MjIuODMsMzgzLjQ4IEM0MjIuNTA2LDM4Mi40OTYgNDIxLjk5LDM4MS42MiA0MjEuMjgyLDM4MC44NTIgQzQyMC41NzQsMzgwLjA4NCA0MTkuNjU2LDM3OS40NjYgNDE4LjUyOCwzNzguOTk4IEM0MTcuNCwzNzguNTMgNDE2LjAzMiwzNzguMjk2IDQxNC40MjQsMzc4LjI5NiBMNDAyLjgzMiwzNzguMjk2IEw0MDIuODMyLDQwNCBMNDA4LjQ4NCw0MDQgWiBNNDEyLjg3NiwzOTAuMzkyIEw0MDguNDg0LDM5MC4zOTIgTDQwOC40ODQsMzgyLjY4OCBMNDEyLjg3NiwzODIuNjg4IEM0MTMuNTI0LDM4Mi42ODggNDE0LjE0OCwzODIuNzM2IDQxNC43NDgsMzgyLjgzMiBDNDE1LjM0OCwzODIuOTI4IDQxNS44NzYsMzgzLjExNCA0MTYuMzMyLDM4My4zOSBDNDE2Ljc4OCwzODMuNjY2IDQxNy4xNTQsMzg0LjA1NiA0MTcuNDMsMzg0LjU2IEM0MTcuNzA2LDM4NS4wNjQgNDE3Ljg0NCwzODUuNzI0IDQxNy44NDQsMzg2LjU0IEM0MTcuODQ0LDM4Ny4zNTYgNDE3LjcwNiwzODguMDE2IDQxNy40MywzODguNTIgQzQxNy4xNTQsMzg5LjAyNCA0MTYuNzg4LDM4OS40MTQgNDE2LjMzMiwzODkuNjkgQzQxNS44NzYsMzg5Ljk2NiA0MTUuMzQ4LDM5MC4xNTIgNDE0Ljc0OCwzOTAuMjQ4IEM0MTQuMTQ4LDM5MC4zNDQgNDEzLjUyNCwzOTAuMzkyIDQxMi44NzYsMzkwLjM5MiBaIE00NTAuMTY4LDQwNC41NzYgQzQ1MS45Miw0MDQuNTc2IDQ1My40NjIsNDA0LjM3MiA0NTQuNzk0LDQwMy45NjQgQzQ1Ni4xMjYsNDAzLjU1NiA0NTcuMjQyLDQwMi45ODYgNDU4LjE0Miw0MDIuMjU0IEM0NTkuMDQyLDQwMS41MjIgNDU5LjcyLDQwMC42NTIgNDYwLjE3NiwzOTkuNjQ0IEM0NjAuNjMyLDM5OC42MzYgNDYwLjg2LDM5Ny41NDQgNDYwLjg2LDM5Ni4zNjggQzQ2MC44NiwzOTQuOTI4IDQ2MC41NTQsMzkzLjc0NiA0NTkuOTQyLDM5Mi44MjIgQzQ1OS4zMywzOTEuODk4IDQ1OC42MDQsMzkxLjE2IDQ1Ny43NjQsMzkwLjYwOCBDNDU2LjkyNCwzOTAuMDU2IDQ1Ni4wNzgsMzg5LjY1NCA0NTUuMjI2LDM4OS40MDIgQzQ1NC4zNzQsMzg5LjE1IDQ1My43MDgsMzg4Ljk3NiA0NTMuMjI4LDM4OC44OCBDNDUxLjYyLDM4OC40NzIgNDUwLjMxOCwzODguMTM2IDQ0OS4zMjIsMzg3Ljg3MiBDNDQ4LjMyNiwzODcuNjA4IDQ0Ny41NDYsMzg3LjM0NCA0NDYuOTgyLDM4Ny4wOCBDNDQ2LjQxOCwzODYuODE2IDQ0Ni4wNCwzODYuNTI4IDQ0NS44NDgsMzg2LjIxNiBDNDQ1LjY1NiwzODUuOTA0IDQ0NS41NiwzODUuNDk2IDQ0NS41NiwzODQuOTkyIEM0NDUuNTYsMzg0LjQ0IDQ0NS42OCwzODMuOTg0IDQ0NS45MiwzODMuNjI0IEM0NDYuMTYsMzgzLjI2NCA0NDYuNDY2LDM4Mi45NjQgNDQ2LjgzOCwzODIuNzI0IEM0NDcuMjEsMzgyLjQ4NCA0NDcuNjI0LDM4Mi4zMTYgNDQ4LjA4LDM4Mi4yMiBDNDQ4LjUzNiwzODIuMTI0IDQ0OC45OTIsMzgyLjA3NiA0NDkuNDQ4LDM4Mi4wNzYgQzQ1MC4xNDQsMzgyLjA3NiA0NTAuNzg2LDM4Mi4xMzYgNDUxLjM3NCwzODIuMjU2IEM0NTEuOTYyLDM4Mi4zNzYgNDUyLjQ4NCwzODIuNTggNDUyLjk0LDM4Mi44NjggQzQ1My4zOTYsMzgzLjE1NiA0NTMuNzYyLDM4My41NTIgNDU0LjAzOCwzODQuMDU2IEM0NTQuMzE0LDM4NC41NiA0NTQuNDc2LDM4NS4xOTYgNDU0LjUyNCwzODUuOTY0IEw0NTkuOTk2LDM4NS45NjQgQzQ1OS45OTYsMzg0LjQ3NiA0NTkuNzE0LDM4My4yMSA0NTkuMTUsMzgyLjE2NiBDNDU4LjU4NiwzODEuMTIyIDQ1Ny44MjQsMzgwLjI2NCA0NTYuODY0LDM3OS41OTIgQzQ1NS45MDQsMzc4LjkyIDQ1NC44MDYsMzc4LjQzNCA0NTMuNTcsMzc4LjEzNCBDNDUyLjMzNCwzNzcuODM0IDQ1MS4wNDQsMzc3LjY4NCA0NDkuNywzNzcuNjg0IEM0NDguNTQ4LDM3Ny42ODQgNDQ3LjM5NiwzNzcuODQgNDQ2LjI0NCwzNzguMTUyIEM0NDUuMDkyLDM3OC40NjQgNDQ0LjA2LDM3OC45NDQgNDQzLjE0OCwzNzkuNTkyIEM0NDIuMjM2LDM4MC4yNCA0NDEuNDk4LDM4MS4wNSA0NDAuOTM0LDM4Mi4wMjIgQzQ0MC4zNywzODIuOTk0IDQ0MC4wODgsMzg0LjE0IDQ0MC4wODgsMzg1LjQ2IEM0NDAuMDg4LDM4Ni42MzYgNDQwLjMxLDM4Ny42MzggNDQwLjc1NCwzODguNDY2IEM0NDEuMTk4LDM4OS4yOTQgNDQxLjc4LDM4OS45ODQgNDQyLjUsMzkwLjUzNiBDNDQzLjIyLDM5MS4wODggNDQ0LjAzNiwzOTEuNTM4IDQ0NC45NDgsMzkxLjg4NiBDNDQ1Ljg2LDM5Mi4yMzQgNDQ2Ljc5NiwzOTIuNTI4IDQ0Ny43NTYsMzkyLjc2OCBDNDQ4LjY5MiwzOTMuMDMyIDQ0OS42MTYsMzkzLjI3MiA0NTAuNTI4LDM5My40ODggQzQ1MS40NCwzOTMuNzA0IDQ1Mi4yNTYsMzkzLjk1NiA0NTIuOTc2LDM5NC4yNDQgQzQ1My42OTYsMzk0LjUzMiA0NTQuMjc4LDM5NC44OTIgNDU0LjcyMiwzOTUuMzI0IEM0NTUuMTY2LDM5NS43NTYgNDU1LjM4OCwzOTYuMzIgNDU1LjM4OCwzOTcuMDE2IEM0NTUuMzg4LDM5Ny42NjQgNDU1LjIyLDM5OC4xOTggNDU0Ljg4NCwzOTguNjE4IEM0NTQuNTQ4LDM5OS4wMzggNDU0LjEyOCwzOTkuMzY4IDQ1My42MjQsMzk5LjYwOCBDNDUzLjEyLDM5OS44NDggNDUyLjU4LDQwMC4wMSA0NTIuMDA0LDQwMC4wOTQgQzQ1MS40MjgsNDAwLjE3OCA0NTAuODg4LDQwMC4yMiA0NTAuMzg0LDQwMC4yMiBDNDQ5LjY0LDQwMC4yMiA0NDguOTIsNDAwLjEzIDQ0OC4yMjQsMzk5Ljk1IEM0NDcuNTI4LDM5OS43NyA0NDYuOTIyLDM5OS40OTQgNDQ2LjQwNiwzOTkuMTIyIEM0NDUuODksMzk4Ljc1IDQ0NS40NzYsMzk4LjI2NCA0NDUuMTY0LDM5Ny42NjQgQzQ0NC44NTIsMzk3LjA2NCA0NDQuNjk2LDM5Ni4zMzIgNDQ0LjY5NiwzOTUuNDY4IEw0MzkuMjI0LDM5NS40NjggQzQzOS4yLDM5Ny4wNTIgNDM5LjQ4OCwzOTguNDIgNDQwLjA4OCwzOTkuNTcyIEM0NDAuNjg4LDQwMC43MjQgNDQxLjQ5OCw0MDEuNjcyIDQ0Mi41MTgsNDAyLjQxNiBDNDQzLjUzOCw0MDMuMTYgNDQ0LjcxNCw0MDMuNzA2IDQ0Ni4wNDYsNDA0LjA1NCBDNDQ3LjM3OCw0MDQuNDAyIDQ0OC43NTIsNDA0LjU3NiA0NTAuMTY4LDQwNC41NzYgWiIgaWQ9IkJMRUVQUyIgZmlsbC1ydWxlPSJub256ZXJvIj48L3BhdGg+PGcgaWQ9Ikdyb3VwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNTEuMDAwMDAwLCAxNDMuMDAwMDAwKSI+PHJlY3QgaWQ9IlJlY3RhbmdsZSIgeD0iMCIgeT0iNzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSI4MCIgcng9IjEwIj48L3JlY3Q+PHJlY3QgaWQ9IlJlY3RhbmdsZSIgeD0iMzgiIHk9IjI0IiB3aWR0aD0iMjAiIGhlaWdodD0iMTcyIiByeD0iMTAiPjwvcmVjdD48cmVjdCBpZD0iUmVjdGFuZ2xlIiB4PSI3NiIgeT0iNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMDAiIHJ4PSIxMCI+PC9yZWN0PjxyZWN0IGlkPSJSZWN0YW5nbGUiIHg9IjExNCIgeT0iNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMDAiIHJ4PSIxMCI+PC9yZWN0PjxyZWN0IGlkPSJSZWN0YW5nbGUiIHg9IjE1MiIgeT0iMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIyMCIgcng9IjEwIj48L3JlY3Q+PHJlY3QgaWQ9IlJlY3RhbmdsZSIgeD0iMTkwIiB5PSIzNSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1MCIgcng9IjEwIj48L3JlY3Q+PC9nPjxwb2x5Z29uIGlkPSJUcmlhbmdsZSIgcG9pbnRzPSIxMjMgMTMyIDE5NS4yMTMzMzMgMjUxLjA5MDE3OCAxMjMgMjkzLjcyOTc0OCA1MSAyNTEuMDkwMTc4Ij48L3BvbHlnb24+PHBvbHlnb24gaWQ9IlRyaWFuZ2xlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMjMuMTA2NjY3LCAzMTUuMzQ0NjI3KSBzY2FsZSgxLCAtMSkgdHJhbnNsYXRlKC0xMjMuMTA2NjY3LCAtMzE1LjM0NDYyNykgIiBwb2ludHM9IjEyMyAyNjQuOTU5NTA2IDE5NS4yMTMzMzMgMzY1LjcyOTc0OCAxMjMuMTA2NjY3IDMyMy40NTYyODUgNTEgMzY1LjcyOTc0OCI+PC9wb2x5Z29uPjwvZz48L2c+PC9zdmc+","external_link":"https://bleeps.art"}';
    }

    function tokenURI(uint256 id) external pure returns (string memory) {
        return _generateWav(id);
    }

    function uint2str(uint256 num) private pure returns (string memory _uintAsString) {
        unchecked {
            if (num == 0) {
                return "0";
            }

            uint256 j = num;
            uint256 len;
            while (j != 0) {
                len++;
                j /= 10;
            }

            bytes memory bstr = new bytes(len);
            uint256 k = len - 1;
            while (num != 0) {
                bstr[k--] = bytes1(uint8(48 + (num % 10)));
                num /= 10;
            }

            return string(bstr);
        }
    }

    // solhint-disable-next-line code-complexity
    function instrumentName(uint256 id, bool doubleEncoding) internal pure returns (bytes memory str) {
        uint256 instr = (uint256(id) >> 6) % 16;
        if (instr == 0) {
            str = "TRIANGLE";
        } else if (instr == 1) {
            str = doubleEncoding ? bytes("TILTED%2520SAW") : bytes("TILTED%20SAW");
        } else if (instr == 2) {
            str = "SAW";
        } else if (instr == 3) {
            str = "SQUARE";
        } else if (instr == 4) {
            str = "PULSE";
        } else if (instr == 5) {
            str = "ORGAN";
        } else if (instr == 6) {
            str = "PHASER";
        } else if (instr == 7) {
            str = "NOISE";
        } else if (instr == 8) {
            str = "FUNKY_SAW";
        }
    }

    // solhint-disable-next-line code-complexity
    function noteString(uint256 id, bool doubleEncoding) internal pure returns (bytes memory str) {
        uint256 note = uint256(id) % 64;
        uint8 m = uint8(note % 12);
        uint8 n = m;
        if (m > 0) {
            n--;
        }
        if (m > 2) {
            n--;
        }
        if (m > 5) {
            n--;
        }
        if (m > 7) {
            n--;
        }
        if (m > 9) {
            n--;
        }
        bytes1 noteStr = bytes1(uint8(65) + uint8((n + 2) % 7));
        bytes1 octaveStr = bytes1(50 + uint8(note / 12)); // 48 + 2 = ascii code for "2" the smallest octave available here, A4 being 440Hz

        if (m == 1 || m == 3 || m == 6 || m == 8 || m == 10) {
            if (doubleEncoding) {
                return bytes.concat(noteStr, "%2523", octaveStr);
            } else {
                return bytes.concat(noteStr, "%23", octaveStr);
            }
        } else {
            return bytes.concat(noteStr, octaveStr);
        }
    }

    function _prepareBuffer(uint256 id, bytes memory buffer) internal pure returns (uint256) {
        unchecked {
            bytes memory instrument = instrumentName(id, false);
            bytes memory note = noteString(id, false);

            bytes memory start = bytes.concat(
                'data:application/json,{"name":"',
                instrument,
                "%20",
                note,
                '","description":"A%20sound%20fully%20generated%20onchain","external_url":"',
                "https://bleeps.art/bleeps/%23id=",
                bytes(uint2str(id)),
                '","image":"',
                imageStr(id),
                '",',
                '"attributes":[{"trait_type":"Instrument","value":"',
                instrument,
                '"},{"trait_type":"Note","value":"',
                note,
                '"}],',
                '"animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAABAAgAZGF0YQAA'
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
    }

    function imageStr(uint256 id) internal pure returns (bytes memory) {
        bytes memory freqTable = FREQUENCIES;
        bytes memory instrument = instrumentName(id, false);
        uint256 hz;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            hz := div(and(shr(232, mload(add(freqTable, add(32, mul(mod(id, 64), 3))))), 0xFFFFFF), 100)
        }
        return
            bytes.concat(
                "data:image/svg+xml,<svg%2520xmlns='http://www.w3.org/2000/svg'%2520viewBox='0%25200%2520512%2520512'%2520style='background-color:%2523000;stroke:%2523dab894;fill:%2523dab894;'><rect%2520x='6'%2520y='6'%2520width='500'%2520height='500'%2520rx='64'%2520style='stroke-width:8;fill:%2523000;'/><text%2520x='35'%2520y='35'%2520dominant-baseline='hanging'%2520text-anchor='start'%2520style='fill:%2523dab894;font-size:32px;'>",
                bytes(uint2str(hz)),
                "%2520hz</text><text%2520x='256'%2520y='170'%2520dominant-baseline='middle'%2520text-anchor='middle'%2520style='font-size:36px;'>",
                instrument,
                "</text><text%2520x='256'%2520y='330'%2520dominant-baseline='middle'%2520text-anchor='middle'%2520style='font-size:72px;'>",
                noteString(id, true),
                "</text></svg>"
            );
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
        uint256 filesizeMinus8 = ((numSamplesPlusOne - 1) * 2 + 44) - 8;
        uint256 chunkSize = filesizeMinus8 + 8 - 44;

        // filesize // 46 00 00
        resultPtr = startLength + 32 - 52;
        // solhint-disable-next-line no-inline-assembly
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
        // solhint-disable-next-line no-inline-assembly
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

    function _generateWav(uint256 id) internal pure returns (string memory) {
        bytes memory buffer = new bytes(100000);
        uint256 startLength = _prepareBuffer(id, buffer);

        uint256 note = uint256(id) % 64;
        uint256 instr = (uint256(id) >> 6) % 16;

        uint256 vol = 500;

        string memory table = TABLE_ENCODE;
        uint256 tablePtr;
        uint256 resultPtr = startLength + 32;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // prepare the lookup table
            tablePtr := add(table, 1)

            // set write pointer
            resultPtr := add(buffer, resultPtr)
        }

        bytes memory freqTable = FREQUENCIES;

        // uint256 numSamplesPlusOne = 1461; //(3 * ((((61 * 16 * SAMPLE_RATE)) / (7350)) + 1)) / 3; //3 * 3 * ((22050 + 3) / 3); // 8 = speed
        // console.log("numSamplesPlusOne %i", numSamplesPlusOne);

        int256 pos = 0;

        uint256[] memory noise_handler = new uint256[](4);

        vol = 0;
        for (uint256 i = 0; i < 8766 + 3000; i += 3) {
            if (i > 8766) {
                if ((vol > 0)) {
                    vol -= 1;
                }
            } else if (i % 2 == 0) {
                if (vol < 500) {
                    vol += 1;
                }
            }

            // solhint-disable-next-line no-inline-assembly
            assembly {
                function abs(a) -> b {
                    b := a
                    if slt(b, 0) {
                        b := sub(0, b)
                    }
                }

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

        _finishBuffer(buffer, resultPtr, tablePtr, 8766 + 3000, startLength);

        return string(buffer);
    }
}
