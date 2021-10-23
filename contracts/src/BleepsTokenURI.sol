// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

/* solhint-disable quotes */

contract BleepsTokenURI {
    string internal constant TABLE_ENCODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    bytes internal constant FREQUENCIES =
        hex"00198d001b12001cae001e6200203100221b00242200264800288f002af8002d8600303b00331900362300395b003cc4004061004435004844004c9000511d0055f0005b0c006076006633006c460072b60079890080c300886b00908700992000a23a00abe000b61800c0ec00cc6500d88d00e56d00f3110101850110d601210f01323f0144750157c0016c310181d90198ca01b11901cada01e62302030b0221ab02421e02647e0288ea02af8002d8620303b10331940362320395b403cc4604061604435704843c04c8fc0511d4055f0005b0c306076306632906c464072b6707988b080c2c0886ad0908770991f90a23a80abe000b61860c0ec5";

    bytes internal constant NOISE =
        hex"1275b0103dcd1195c60e332a0afb540cf67a0c46c110b59a0f2fc90ecc1710eb84126b070ec93f136d8c10bef30c65ce10b6d90d97a80d571711e2b912731e13215d0f106c0dc9940c04390dbc940bed941179470fbb101171d90dd0920b02cf0e6a760d8be20c1d110d42320e776b0bdf450e453e0c55fd0c4dac0c1f23093bcc0e82fa0b7e131005240b1dd10c4d0f0a4c2c0848130cd82f0d36080be4750adbde0adfdd0c0b370d76ff0f339b0c9efa0ac31a0ceb03090c7a0b92dd09ec040c18c90f65c80ebe3610191f0c7c6f0c873c0bf4db0fb1110ab1da1043370c0c470967f1076e9405eccf052cdd069b240477740a65170c958d09390307a2640c623d0b1db90b64480abb160a72e20806d708862507c9bc09ed3b0d88b9082a3306b39b0992350ccbd00f36fb0ba76f083ca2065b72071fb0066c56042fc805f3f20550220b16fa0808a70c6f92073ddc0702360830780c21c1079dd40c92ec0b6a930d3ee80cbc380b70190f3a321165850e034a0ce5430e20120c61aa0b1b1c0d48ba0efd2210fca8121ee00eaa1211aba40d08ab1137e10c0f9e0d570b0ab9d60addc10e03be0f07a10eee4d1151231213190e45bc0f2e52106c230f3e4613077c14761412de6211c0bd0dbb4e0dc6340b852f0efb1b111ec80e2f1e12fd95147d240e73cc125a530e72820bd9240ceba00b6a910d35b40c70230e8a530fc025129b541230c414e8db15e18714dac7165cf710d1970fc7d50eb3fa0d7cc011e4520cc37d12224113f3120f400d0f73e70fb7a611c2e90c9a150aa6340ccaca0a8fbf0ffcc01216c61220d30e75e110ae240cb594118dbe10da2f0fc6320f7102121b7b1209c80d1b8112831a0e16f70ecb6f0be1be10e27c12ffc212382a0eb5560c8dcb0fd0b213293d0eb69c1269b11431ac1192851135c913a0c51033800e76bc0d06de0c02850dcd9e0b3f3b11142e135b1a0d68ec0ef4be0cd8bc10541d11c8b41092c80cdcf20fc40c0e4e6d0f5c9e11ebb90dfc9311c833147d5b165ee210f70f1470d010fcf811b96e0daa440cefc20a4edf0a0fde0d929d0e81c00ee53b0dac330c8ab70d4cfb0f3a4c0c40270f5bbc0c0c5e0f4ace0c80011089381323270d17840e23d50ce6a80ecaee0dfd380e2b621284e30e576513139614042d12aef91301300ff9ae126c980deb9712d6310f24040d98dd11a09e121a82153e900ed81713afb011c55414888116f567180c641799f1180b711295570fa3140df3500d1b441051250db81c0c88db0e4dcf0b1f4d11479710b1ec0f01010f2af30fb0e50fdbf71051fd0caab00a180108e3650909120f58530be9e70d316b0c22790909990fa3220bf5f80922f70d189f08c7bd0757f20dfab30bcaad0cf84b09c3db0d511e1076970b297e0e14490cb1060ece4d10ad4c0f3a240cd6cc0c95310c145e0f2e500b902310d9a911711f0ea04c12d08e14b128148c2d0ee141139dc31467c814176716f69516077611fa4811b22f1102a5134b74153e9c15eeb211381b0e54ac1068241257ce0eba050dd0c4115b640ee2980c9c3b124fd30de8ae10b77c1059b812dfd114d9690fe77811322c11c7cb108fc4149e7a13122c11619e14930b139db6148cec110cc7126ca11191820fb00b10ee0313bf4a16493b16bac7132112163e7911528e13ff8c1482e917378218549015adef154164127daa1162a10e42561388bd14ef541383e1113f761526cc16fac610fef10f1e2013590211b55e11a40715f99f1684ab18b1b612cfbb166c83190d4013bb5714f3f6158e5713dacf13b46910acb01469971130e4107c2a0db1dc0efce4116e5b0d99ce101da30d1b310db7c60ad7f00ea6c20f9ea60c4fa10e16660e61bf103e7e0e45180ea6150fd8940dfe1212694c10c51e126f8c0d9399101e5412ec35125c2113912d0e3deb12d26b11b89b10d8110ccf68108f4d122b1c0f957b0efa3a11d46e0dbc950eff8a0f435e112ad913ff5f1533d8116125132c2814f07710a2a10dcede0e4f000ff7f613c8e914c66e12d3250f15741416610f905e114ffd12ea6113020d10137510905113cc6f1572ed103acc0e53f010836e0cae4f0ec09e0f3ad6102ce7116fbb13a50f14727611be0115354f1092f40de898133ba4159ea214ee741501421412e6167fb717c92b1858cc16f2ea1469f712ee3614c49a14cc1415606f17819717cb8814b770173b9d1242321261c6124e8b1399c314209a1020190edb98147a34168cd216fd7716a7f617500316298017007e14589b14569d10d9ae157cbf10161a128cc5107dda1432f810304711b4f513c14016991a13fc98144a6716ed7113d98c17963013a059128a31158a5313084312451e1534e013c51710f8d7164e18172d581167a212c53810d14c121324103fea124b5213beb80f3e920dc7d30baec50eaea711b02112f3f70fdd7d0eeee11297f40f20d90c652f0f09840cf3401271da122c921460a116f0de11ec630f6ce20cdf3e11a9d20f69030f6f860c54f710fadc0d6ca40ad93c09acb20f9bc60ade2f0c98271067af0b413f0a60560c74220da9740f8dd50fe1f40f5c251149aa144cd71055bf0ce8431011d80c5b210cc01e12152a0c707b0c49900b17b60be2eb0bfe7009361d0a7c1b08915b0ca84208fa040c18090fbc74114ae50fdb3712c96d0ef50b1016240e53ed1014170c37a4115a5712e4ea0cc3360df7210f07990c6d5c1033a612a4c20cfa8a101fad124eb51210551026b1117d89148b250e7af11310860e1d801105d7136a1513f9ba11be39146c9e16e8e117ddea16c84018f8f5188680170714183ab317ca3a14abb515b07815afa2137285112f6214922b16a7bf19190119c684147e91159cf31725c7140d88131d0715036113bdac168f37150c8113ab201795281374f91362b413ad9c14699414d73a15f27413854d16b13013de74156d9314f65c17650019261c17ebd4185780170a6716f00b19076518baba13ffbd11e81815de45192051139b77107369154844184e37158d40173aa312f49118341e1a144e16f2471672b51615c514d12016bc0b1932961454d011b78111acf0157951120e6913e14714cd7312bf3416c4d4152208146881161b80132dea1785d2120d5c16190d1625cf17feb6152566132cb012dde1162077181a4c1533d418afd312973a11790310eab7104b4f1147c7130bd2107a0d15c6c613014215b226147007132bd50f964e12e7250fc93c12377a143fba15eb60131535101ef80f9520134cfb157e7f11d68c1574cc11f6781652ed1440e710aa19121af114c01911daf515f04f10a73411030d134c5b1487ba12f315115c98143d0113051314d96f108e0b0e823c136f1e0f685c0e201310efd414e44112db4b14d32910bcfb143dc213575b15c8901780d513ff3216c12c15e2e315797a15d62910cdcd1303b713e0a60ff2db133c6c0ec7331320ee0fc89b14b69a167f381066e214650212ecc413b81514fbfc13a3841057ba0fbc9313db75168bcf143797132956130f1a111535153ea51313b911ee76131cb615e80b169b5a18d77917af4b14833416612213ca3f14cf1a158c9310953c11d4e9104a560ef4750debf510ca930e2ea60dc53d0ffe700fa9c00f074f11d7ba14bc5813ed0011f498158b9117e1fb15552a13a55f10512512bd5c13841011da5913cb920f694c0fda7814673512626a0e43350e893e119cab11a884147dc116e851117a8a1215381412f815c52411c9570f48531292320ee21f0fddde0dfad911b96a0f1f7d0cc2840ddb570fc0441329a31555860ff40c14a7d510449d14c8490faca50cbedc0fc93d12f31410aa680e53fe0d5f6e0fe07f0dad0e0fb5a30d48711197510e09240c0ea7109402138db214b83116e7311290301664801642d7183ef0166eb11447ba12426b14ff2a13284f14580f1155ae124c2410a34913a7920f8c9a0fc3ab0f73e911e27c153cb416376715dcba15c1ee1513b1178db5180b7c1546ee196ac418ea9f196a9216c21e1a03951973fa17aa7c1ac23d1a726c19e70817344313736410f6140f9b0912107a10ea2613c949152ca313858914332113522714c2af13b87b164fb3148acd111bbf16feed18433f137f281668c117d6f51911c71a25581c187417a3bd191b3414dbb21233d310e494144ee0161d0112f81a13fe2812089f1388d316d1a916a4d212e51d15ff84111d531093c513429011a5d812390611c05913d9911332e512d6c016867316971314d369130d50101c621200350ee02d10a82b0e892310b53e1314f011f908122f4f11596812bcfa1336ff102c0313a9c415899a12c3ab13d3c81479cc167e601557c310c34e16555d142b741635a518e337143d4815b3c513f96f11ccf10f39fe1102880dbbab128b7513abd0170ec2146ceb12909912d72115144311ead21088f40e89ec1354f511713f1369561557e414662f0fae841002850d5e850c96d80b2b7c0f9924101cd310e0af1306aa0d9ae30dc50d0c23090f816a0e86d2119b8111decd13396c0ff8f9104fa80e11f71226ed15214614362d10b4420d94f50ff37113bfef125f9211b9b912102610eeeb11742b0d6be613327414164f0fa25c0e050d0ed6f30f3049111bec126a8715ccc9160cd20fe9301570301121e9146d5c14736a1224921342db14b81116f1d112c16010cca911644f0fc6271138d70f342b11ed690d86801397e413ac55143c2a14ab7d12fe51168bd212c8c41169fd10070a0f346b10324612aefc118f770e4108132bfe1624d5104eaa14bf760f354a127e8c133a8a155295121bc71120e715302b11cbdc137e2512568b15ea9f16909417f5c511ca7712b30216404a10bb7210e0dc14add116dc0a12f7da1459541359d41134a112057411a37611635e14587c145f0712749812fcfb1326590f670514acbb11c5b712114c14ff50105a870dce15143e4f15172417bed112a0af14bb151734351645c013cea31016cb0e2d990d2d7f0bcbc80c0ce611ce0613cabb10d21b14c4c214a7db15863d13904b15895e13c84217ba0111a60611a53f15cc71179cff123d840f2d610ddbae117aa5119f0715ca38116edf0f97e113d2100e80d30e1fc610587a13c5f910bc2515558d14747611e5301143b81471080f9c430e1b7a0f2d36136857147afa174d9c1537021068920f276e1218f30f5e790d63a10bb70112428e0f722e13facf0f280e13106f145816112c19123b8e11bcc914ce36149904110621101a770d33a51260761033ec0d6b8a0da6571336fe15a587142b8f1582a312fb5d14a13b128e691122de12d482114a681273ad15ac6a16ddab14411d1851071862ae163928124ef01487a61627381263b513d5e01084200fe9a410ce96142d5211378b0e16a5126c4210cdcf128ae31340ae0f954b0d4699106db911b7e114d4871581b014e72f13678d12bf7e125d7b1357f5136abf118848159d3614bb2a146bfc12292e0e925810cd04139c341110de160406166c8b10e5bc16502c12d78a15709e12887e117f340e579f13b8b111cf9a109eb410e10d1252df11207d139eef10df0712c355167b6112b8bb10b60212d47c15ba3a101c900fdad90e7ef40f34370e3d0b0f72601114dd141c9213be43129839168c851118fb134340161f7b1868ad13f18117183412682f122d3212e7f7166eae17e76e16835e18650a162f1e16227c12754a15e30e173f561702dd16501413723318053b14a0f11448be111e530e839d11c46c10e40b12f79616009813979613b3011667961594b212c72212c8050f8d110eeb3b0d0a1d139fa60ecc100de79f139cd7152d3c0f8f7b103c1e12902e0dc06711aad7126cef0e62b40db95f0be531111f6c0cc37a0b639f0c8c4210bb070e11d2104dc00c7beb0c2aba099b370d722d0a4384102154113a920cb9900d68090d9cf80def580c1fe60b10710b452d0eb6dc0bc1040f934f0e803811fa34114dd90f9cb00cf524110d280ec6600b3a3b09f3380e7db50a926109b00e0b5ec708021208265d06996505fc6404f7e0082b9d09d2fc098bb008aaba0651b60bc6be0f01740e7e7d0e972b0c0f8d0e69c80e364911d6e70bb9390990ca0f6a950de80009a5ef0c762c0fb9c20d7c361183341307a10ee1ba11b494144568142ead0f85670d9aca0cafed1009830dcb5410d27c0d32d20a9a16103ebd0c1ef210119a0cd5c50c9ec00dd4110ccdfd1111980f1fc00f09a30ac7050b8c400d879811b82f103cd10c6bcf0d907609f2d90bf13c0f23e30de5160a62ff093f7b0c51100b78640b53520d0f5c0943100f05ec0978ac0868d70ea4421006010fc86d0bfc250c5606099da40b88d30ff40011e4af0e91c40d4ed00b0d3d0fe6a70b82970aee980cf44d0c74070efdd30cca220f1f7c0fd5b30d5de111caee0fae180ed97f1187ed12b22a0f285d0ebaa50b969c1197ed1148341480c41099550f04f71205d50eec790c5b5711d4720d11fa1261b6105fc910720c1307a60e25630cee26108dd110a8c512fe080fa25b0bdef40a2ca70bb8ca10b4680df0c30c058611085a12484014ba850f1a771026ae0e6627126a5f0e6b551020220b9ae111f232143d1e1221130f285d1095c20de61e120da80f49050e7dab0f6c01120e8414b9e90f82bb0e14581369360e1ab40fc1230dd7c00f03870ff0fb0c481f1005901065730b8d480f95190ee3a50dc5a210e86e13b0471588c816a7db17c6e5184c6317c9ff1186c0160bd013886812371a16a25d17ba91151e24159e1f10730e1407d514225d152f211828a1197ee6149e1710c41810da940db53b10bffd0caf240fca930ca6df12abe80f65d60da3d10f5fd90d0b940a9be509fc070aeb921080940df4fe10199e1058df0cf79c118c9c0c08ca0ad35209e6290d47590a989a0c1c1e0889420c664f0934420ae78e075fa608ed0b0c191b0ad7070fa83d0ece610b2e0b0f59ac0a3aa707eab90b1b5f0e29c80aa2840deddd091afc0b4ee80f58fe0ac4f20c92210ddcc30ea1040cd4570c6ab40a08980aa16b0e7b4e0db79e0a399f08ce830eeecd118e42117dcf13d39a12234012138f0d838110c40410ba240c3f920b15660cf85c11a8a10b64010fdaad0c90a91106eb10345d0de0800fd3bf0f27c312dbab139120143c8814084b0fea4311b21e1409ac1657fd126093169833105bfd10e26911c0e50d460113a7c60fd2380c59df0c87230a0a9d0f30950c67440e94d50e53fc0a90800a7bcf0e9bae11e17610f5400d880f0f06fa0cf7ca0a07d70dc5750a3d770e7b2412161f0e5b980c0bac0fbf7d0da7c50e16c70e44fc0c636d0a68ae0f14de11f7b7116a5010d07d0c3a690d00e21006e90eb2f50a916e0d51d10aa6f110037d0b38800c67570e6d980edf770dcf250ff6a311419813460c112cab0e7c9011712d1283a0149b4513d52b12f62a10591d0f777912652d0e34810bc1f20be7020ea2250c7d350b89ab10fdd91111990f00b30d75a70bbb800c81440dd1671006570f5b0c0c079e113c3911a3a60c8b960bb9170a35700fe8520bf8460bc5ba0d17fd0ee20c0e3a660fab780e976c10a2050f7ce7130f710fe72f1024f612d89712e8201018b0103049137acf0e9a40132421148099110b7614c2941213a413fe69100a960ed99711d09c1484a21397d615811a12f138116b8011a22115d63f16786e143dfd16010a11a46411387d10985e13b0e1120e07154f3c1643531881d919f87a18aaf615d0fd13691f14b4e616359818757714a02910ab8813fab11332bb122ec41027e414904611ef9712913f10000d0ef7a1123c40148c3616705414319d16c3e21200b811a092121ed815a50513ec48149fe316d5c815fe9d17818d1a002c16174b14841515f34b1357eb155b3f189ace14a7eb143975105cae1394241471eb15f21f12da2a1337ed16b0c412986e1426081792c418845b15bcfe139802124685104e4b10c98d0ffddc154f44108d371338cc1367e21404e3128893121b64131ad51630b017559f1894f01901c51b41b6182ede14ee1111b54211dfae0f50e9107d8313751811f26411e4c60e44290c7a6a0f60260ec8f30b7dbe112dd412c5420d46e20dda0510ca910dee490cf1040ab8750fda340c8f910cc98112258c0fd45a0e200812469813ae58120ffa0f33950e019c112ac50d6f440acd201058440f57f00dca0b0bdb9511bece135e7512474a142a2213d53114c7de0f17cc0f6967138c0112026411238f0ffc550fff9f0cc3780e7d861042a50cc2c21128170cac700f17550aec68108e7a12fcb20fabe9105b18140ce70f573c0fe02a12b6710f3a090c50380ead7e0d90cd12363b0fd8b310b257104b400d143d0b7d670a1bba0c657a0af24a0a09210acd4609012b0808a00cd6b80f64a2114418122ae70db1050bf3cf0df48b1245be124d4810459b13bb2912c0ff12a29a11a26a11daab125f95138cfc154d8c13ba8d11ca5f0e493c0f6d2f0e27ea0f0b7a10d2991245cd10983f135f220e095e0cf83b0a5a110db1f20e72a50d0ccb0f77c30e3fa5120859112f451412fe11cbce0fd2a110458d13fdd31588ab120ab2144d960ecc331154900e7afb0dfa2c12261b128dad1401e50f78bc0f53b20d96d50d605d10bef50c9fb31223560d6dab107cb813beba10c65a11167213e2a70e75790ec7be0e6b040d4688109c7b0fc88a10a19d1341cb13862012e543119d8b14d20111d7b01116ba145a420ec11a0dd7040bcc4c0b9b300c76d41086aa0b67cc092d8c0a364b07c49e0b056b095cc40716a50ba0970740be07af310c2de20b72820a85900958e50900780e64fd08b5c10d8a0c0dba870cd7df08ead70bed090b9bb70e580f0b90cb0fc46912860e0f6d3310dfa30caf860f5e0f0dc2ab0b978309c1e80e0b73095bef0d5c410e8ae2104ef10c7d2e0b3ecb0ac64c0c87220c0b190d90bb0a81f8081b41086c0d0d0b8909bf8d0f42451082f01022ec0bbd890cb8280e09520f9a810d98990ed7f6112d320c4e1a11f6f9131f981500be0f062111fac00d31100f958d0f546412638c101d860e192f1208a71422301353c5130e2d157714170926134fbf16f6e311c4841505d0174255163ed3177c581219a21115241128830e00130f4026100a2014151f0faf990cc3a31015120ee7860befcf0fa8ce114a9a14862f12df581384e911683f10758e10ab1711f6780f40c012860314292012bf0215a7c71232c51176a010f7a0119137148d5214799814d97f1074e80d81ab10ea9d14525b0f397e12077013f03b15cbad13e4350f70390dcba70eed500d1f91116f700cfa4112873f1393f016101614c4bc1280ee14570610a47e1530000f292a0ca3750c2ed40d7c610fce4213938114df1c146afd14f236157bfe16fd0216927d15fb50158afd184f4b14aebb14c15614c85d163efd16d5a817ceba16cbfb18609a159f21142d9218a8861a7a081be94114ec7119deb51546e013397417151619a14515185e122dda138c6716b1f414cc2514141517033c1378e814062f162a3c176b6618a16d1a98471836211b9ff115d03b13545018d2911539e813ec8d1710b017bd43138ebf1660a1134c57135fbd174eb513ec6215297b15af4511308d16d97218102e1715ab19d3a4159653130f7814e92814d0ca13bb9f15819615c14811348413f544134ef7158c29147c75119d9c1083810e02160f67841020e814e5f91084fa13296a10c7710f07b61171a8133ec60f8b810f84460cd0c61269db0f714610ca360fc01e0f56f10de40211ca04125d7f13e13d1307070fe1b20e78c70f219b112ffe150e3e15859414126013cfac14b3e0179e5d19868b16b3b613e77e1664811248a914a1b412e65413fa3711ce5a101c10108d401399e614e28c13107412150d0f28351236d5115cd8106f6c0ebad30cade10d85f41127871141b011dfbe0d25870d4c5710a914126507143a27157a6817dd251849901a227315b26b11fa3e11df1d10450513c69916701115901d12ec831610ec1798db123cd41619e917c7081647c7156826131cad0fe1db0f287514f5b91469d615e8b61887b918cff11a1a7119a4b713e63114927d13806a0fdfb6157f6515c32c12f8ac17ba18162ea2149b8f146c8912daca12c2091257a01345f91182510f67230fbef6112cb40f1d100e89050c22b210557b0e3e991191060e6cbe0f0cb20dc44911ee3513cc3c131fb2113a500f7f340dead31294b8153033130af015ff4a14ada813c05d1152cf0efd4e0fe743144e401363ae1717a717ebbc17b0f717bad417ab1f131b5a17341f178561128191134bdd11f59c151da11666de157fb215562c1814c415b6e612240a10a8901388c917482815c6b6164970171f0f14ebe912569210f606152b4915b9721785001461b113c79a15432810b2421668e51305dd17ad7617f0db141b75190c8914405f1802a417f95b18b08614e43612aefb11a83815982e1255c41583d814ae4614a64c1752141634f713dcfc127c091351ce1374de114b2d130d1d11fc5310d2e91350101024d212a9810f5eea0e18ab10cf621191420eab610f3aeb10e22b0d9c200d17b410c087121ff114958a129d4d0ef8191083ff0f6a10101baa11f22c14e251132d45102cd61056d7131d690f55851262d112021411a616110b5010d6520fa89111810a1351480e3b4d11c04a121cbd135b6615eec812c75f10e75d116d651229af1316a60f4a72148c480f82c10f24830de0e40e59e41336c51125ce14842511fc3714fa361529dc1382cf10e9ed0fe3670fa63811b80e12adbc13167010f70b10810e1092cb0ea4bc12237010a53f137245161c9a1338eb12e52212a501134603145cd011a47914ec2513b09d15e9e71798c21774fb132383107cf214a3681176d112d15012ed8113f8e917137315acd6168a5b13cfc81397741215d20fa8a80fcfe111972012abca0e39f41336e70fb8cc0d1f651235690f05421123c512d3ec14a9be159cfc13dc27152d70140cdd127cc216cfef146a2313aff21664f710d7f20fe74a1467e310d1e813e5b51616a8119a4a1474b5135d96166ef6153cf91719c2136fad122a9f16aca716bbba180d1b1648a614e828183a9e1a69381aa2621afab614e953170f36168ee315b749149a4d12ee931047de15f344181a99173a2b19baf6161f9118222818834014816418a9f5163ce0151daa18340616754a12eb6810e4f60f6c960d8a9412a55610d42910d6df0feed20fa0020cac830f99ab123a0914496f10a7f71301ea118e1d1534b21490b015a83117a53f16487c191b741a858117a63c170a3b197ff9160a70126841125c180fc342127bf310bbe80e71f60f0fc60ddb090c0dce0a75760bc4380dae510bdce910b75b0d4e7c0cd73d0c75391157620cb3f80e055a0bbe240fa45e1025390c90900b14e20c22010b21420f313f0ea1ad105dee10722d1174d20f09990b965e11784e0bcbcd1132640e0a8e1224700f0b56139afa13d689124ba30df9010b9d9911a36210b0cf10f25013fa1010eb851443cc13cf980f155614c8b6122ae516428c1378bc16c43818d4dd133716120d8110e9d111ca4b11b9d51193b915234b12f11e15c92815343511b8a80f6b34138ef70e92d30ed87c124d230e385311b3f20df8ad1018df0ee8cc12b9380f7d9f100d710edf8f0e1a601168f9114293109fea0ceedc11e44f1004f01119b41049f90d6c270c902f10cdb811e1a4122d44111dc5141eb01372490e8bcb13c7ad0efa03141abf15837a12a18b11af0112bf4e0f70a0145a4f12781e1665ff158e0a14524411cc2111d54b12d10d0f3604121d49159b0214b3e816a85114d80611732d11469d0faf5c0f281412589d1008c70fe6380fd12614af13136db01613a815fc8718485813687a166fbf1243fc169701158d2f15879f121303109eca1513bd14b4ec1627dc10d903168ebf17b8fb148bef18c53d12f50e176f4b143dc818002518c89b13c347174a0c1374681239c30fc88b113b2011db8315447c1116ae1661f31307c210f8c21314e913723e118866156b631323f014d81a131b5717186f19634d14d85d14914e16f45c14876f18e0ca1901ef1629cc14706515622f15a1e4153947153084126a9515b292109f821410a514cd0216d0d611f0070fcd8a14927b17937616c13f12a3d011757516ac4a182aa917b58716d1ec17b71514070a14f11d15c99216d2f119ef8c155e8113c3fd139ba8131904117b250e837b129e9514086112546e10d2de1181b910bccb13a1c313d9271082f30f2c3d0fd4b10e950912323c1568a01197160faddc0ec20b138fa210d71910dd8912c7ee0eb9bc0ed97b0d12b80d989b0cc0b70bbcca0fd2820c87540afe481092dd0fd5ce100ecc11db62111cac0f88460c28e30d05770d70d60a4caf0cb9c50f45220dd4810b2aaa093bc30968bc08212809eec7093f640c1e4d0c8db908568606bf6807331007ee730825b90c8fad0769160ce3ea0aff990cee800f40490e295f09fa070e09f50de2310e8f90109c520f2db110a26012fb090e19410b78f00aee25087ce70b6f2f0a325e0ed1a50dd6520f2bcd0fca851285ca135ad3";

    // settings for sound quality
    uint256 internal constant SAMPLE_RATE = 11000;
    uint256 internal constant BYTES_PER_SAMPLE = 1;

    // constants for ensuring enough precision when computing values
    int256 internal constant ONE = 1000000;
    int256 internal constant TWO = 2000000; // 2 * ONE;
    int256 internal constant HALF = 500000; // ONE/ 2;
    int256 internal constant ZERO7 = 700000; // (ONE * 7) / 10;
    int256 internal constant ZERO3 = 300000; // (ONE * 3) / 10;
    int256 internal constant ZERO1 = 100000; //(ONE * 1) / 10;
    int256 internal constant ZERO3125 = 312500; //( ONE * 3125) / 10000;
    int256 internal constant ZERO8750 = 875000; // (ONE * 8750) / 10000;
    int256 internal constant MINUS_ONE = -1000000; //; -ONE;
    int256 internal constant MIN_VALUE = MINUS_ONE + 1;
    int256 internal constant MAX_VALUE = ONE - 1;

    // allow to switch sign in assembly via mul(MINUS, x)
    int256 internal constant MINUS = -1;

    // sample rate: 22050 , bitsPerSample: 16bit
    // bytes internal constant metadataStart =
    //     'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAA'; // missing 2 zero bytes

    // sample rate: 11000 , bitsPerSample: 16bit
    // bytes internal constant metadataStart =
    // 'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAACABAAZGF0YQAA'; // missing 2 zero bytes

    // sample rate: 11000 , bitsPerSample: 8bit
    // bytes internal constant metadataStart =
    //     'data:application/json,{"name":"__________________________________","description":"A_sound_fully_generated_onchain","external_url":"?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????","image":"data:image/svg+xml,<svg viewBox=\'0 0 32 16\' ><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' style=\'fill: rgb(219, 39, 119); font-size: 12px;\'>__________________________________</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAABAAgAZGF0YQAA'; // missing 2 zero bytes

    function wav(uint16 id) external view returns (string memory) {
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

    function _prepareBuffer(uint16 id, bytes memory buffer) internal pure returns (uint256 l) {
        bytes memory note = "";
        bytes memory start = bytes.concat(
            'data:application/json,{"name":"',
            note,
            '","description":"A_sound_fully_generated_onchain","external_url":"',
            "https://bleeps.eth.link/#bleep=",
            bytes(uint2str(id)),
            "\",\"image\":\"data:image/svg+xml,<svg viewBox='0 0 32 16' ><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' style='fill: rgb(219, 39, 119); font-size: 12px;'>",
            note,
            '</text></svg>","animation_url":"data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA+CoAAPBVAAABAAgAZGF0YQAA'
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
        uint256 filesizeMinus8 = ((numSamplesPlusOne - 1) * 2 + 44) - 8;
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

    function _generateWav(uint16 id) internal view returns (string memory) {
        bytes memory buffer = new bytes(100000);
        uint256 startLength = _prepareBuffer(id, buffer);

        uint256 note = uint256(id) % 64;
        uint256 instr = (uint256(id) >> 6) % 64;

        uint256 vol = 5;

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

        bytes memory noiseTable = NOISE;

        // uint256 numSamplesPlusOne = 1461; //(3 * ((((61 * 16 * SAMPLE_RATE)) / (7350)) + 1)) / 3; //3 * 3 * ((22050 + 3) / 3); // 8 = speed
        // console.log("numSamplesPlusOne %i", numSamplesPlusOne);
        int256 posStep = 0; // computed later
        int256 pos = 0;

        for (uint256 i = 0; i < 4383; i += 3) {
            assembly {
                function abs(a) -> b {
                    b := a
                    if lt(b, 0) {
                        b := mul(b, MINUS)
                    }
                }

                posStep := div(
                    mul(and(shr(232, mload(add(freqTable, add(32, mul(note, 3))))), 0xFFFFFF), 10000),
                    SAMPLE_RATE
                )

                if gt(pos, 0) {
                    // skip first value as it pertain to the double bytes for chunksize
                    pos := add(pos, posStep)
                }

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
                            intValue := sub(mul(smod(pos, ONE), 2), ONE)
                            if slt(intValue, 0) {
                                intValue := sub(0, intValue)
                            }
                            intValue := sub(mul(intValue, 2), ONE)
                            intValue := sdiv(mul(intValue, HALF), ONE)
                        }
                        if eq(instr, 1) {
                            // uneven_tri
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
                        }
                        if eq(instr, 5) {
                            // tri2
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
                            intValue := sub(shr(232, mload(add(32, add(noiseTable, mod(pos, 8976))))), ONE)
                        }
                        if eq(instr, 7) {
                            // detuned_tri
                            intValue := mul(pos, 2)
                            intValue := add(
                                sub(abs(sub(smod(intValue, TWO), ONE)), HALF),
                                sub(
                                    sdiv(sub(abs(sub(smod(sdiv(mul(intValue, 127), 128), TWO), ONE)), HALF), 2),
                                    sdiv(ONE, 4)
                                )
                            )
                        }
                        intValue := add(sdiv(mul(intValue, 255), ONE), 128) // TODO never go negative
                    }
                    intValue := sdiv(mul(intValue, vol), 7) // getValue(pos, instr)
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

        _finishBuffer(buffer, resultPtr, tablePtr, 4383, startLength);

        return string(buffer);
    }
}
