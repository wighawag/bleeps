export function symbolSVG(id: number): string {
  let svgpath = '';
  switch (id >> 6) {
    case 0:
      svgpath = `<path
    d="M209.094 19.53L150.53 35.22l234.19 234.186 11.436 11.47-15.625 4.187-182.25 48.78L184 387.032l307.78-82.467.408-1.5L209.094 19.53zm-77.75 22.94L25.78 436.31l45.376 45.375 87.375-326.062 4.19-15.656 11.436 11.468 133.688 133.718 52.22-13.97L131.343 42.47zm41.062 133.655L87.53 492.845l381.126-102.126 17.53-65.314L173.22 409.28l-15.657 4.19 4.218-15.658 49.126-183.156-38.5-38.53z"
  />`;
      break;
    case 1:
      svgpath = `<path d="M256.383306,211.870041 C231.570306,211.870041 211.384306,232.055041 211.384306,256.869041 C211.384306,281.682041 231.569306,301.868041 256.383306,301.868041 C281.197306,301.868041 301.382306,281.684041 301.382306,256.869041 C301.382306,232.055041 281.197306,211.870041 256.383306,211.870041 Z M256.383306,271.868041 C248.099306,271.868041 241.383306,265.152041 241.383306,256.868041 C241.383306,248.582041 248.099306,241.868041 256.383306,241.868041 C264.667306,241.868041 271.383306,248.582041 271.383306,256.868041 C271.383306,265.152041 264.667306,271.868041 256.383306,271.868041 Z" id="Shape"></path>
          <path d="M315.999306,301.867041 C302.294306,319.970041 280.787306,331.866041 256.384306,331.866041 C231.981306,331.866041 210.473306,319.970041 196.769306,301.867041 L161.678306,301.867041 C178.816306,337.925041 215.296306,361.865041 256.384306,361.865041 C297.472306,361.865041 333.953306,337.925041 351.090306,301.867041 L315.999306,301.867041 Z" id="Path"></path>
          <polygon id="Path" points="182.904306 271.868041 182.904306 271.867041 182.903306 271.867041"></polygon>
          <path d="M182.904306,241.869041 L7.97930624,241.869041 C3.78830624,241.869041 0.391306241,245.266041 0.391306241,249.457041 L0.391306241,265.338041 C0.391306241,268.944041 3.31430624,271.867041 6.92030624,271.867041 L182.904306,271.867041 C181.915306,267.018041 181.386306,262.004041 181.386306,256.868041 C181.386306,251.733041 181.915306,246.718041 182.904306,241.869041 Z" id="Path"></path>
          <path d="M503.376306,241.869041 L329.863306,241.869041 C330.852306,246.718041 331.381306,251.733041 331.381306,256.869041 C331.381306,262.005041 330.852306,267.020041 329.863306,271.869041 L504.170306,271.869041 C508.702306,271.869041 512.376306,268.195041 512.376306,263.663041 L512.376306,250.869041 C512.376306,245.898041 508.347306,241.869041 503.376306,241.869041 Z" id="Path"></path>
          <path d="M256.383306,31.8750411 C149.559306,31.8750411 57.2253062,108.428041 36.1173062,211.870041 L196.767306,211.870041 C210.472306,193.768041 231.979306,181.871041 256.382306,181.871041 C280.785306,181.871041 302.293306,193.767041 315.997306,211.870041 L476.647306,211.870041 C455.542306,108.428041 363.207306,31.8750411 256.383306,31.8750411 Z" id="Path"></path>
          <path d="M487.121306,336.202041 L476.904306,301.867041 L383.166306,301.867041 C364.206306,355.281041 313.916306,391.864041 256.384306,391.864041 C198.852306,391.864041 148.562306,355.281041 129.602306,301.867041 L26.1173062,301.867041 L52.5863062,337.564041 L39.0363062,345.386041 C29.3663062,350.961041 28.9913062,364.772041 38.2743062,370.888041 L87.3453062,403.304041 L77.2963062,415.301041 C70.1323062,423.811041 74.4793062,436.927041 85.2943062,439.529041 L142.494306,453.196041 L137.147306,467.903041 C133.271306,478.483041 142.147306,489.327041 152.952306,487.926041 L211.383306,481.218041 L211.383306,496.863041 C211.383306,507.940041 223.040306,515.271041 233.091306,510.281041 L285.706306,483.988041 L291.053306,498.680041 C294.792306,509.002041 308.274306,512.082041 316.042306,503.866041 L356.471306,461.152041 L366.520306,473.149041 C373.746306,481.764041 387.374306,479.605041 391.788306,469.472041 L415.181306,415.509041 L428.731306,423.346041 C438.267306,428.844041 450.537306,422.472041 451.201306,411.246041 L454.731306,352.537041 L470.141306,355.247041 C480.778306,357.273041 490.380306,347.069041 487.121306,336.202041 Z" id="Path"></path>
          <path d="M123.306306,6.53104115 C101.906306,-2.97595885 77.8533062,-2.06795885 57.3173062,9.02104115 C36.7373062,20.0950411 22.7183062,39.6650411 18.8663062,62.7350411 L0.611306241,163.297041 C-0.586693759,170.415041 4.12430624,177.943041 13.0963062,180.029041 C35.9503062,106.943041 90.8663062,48.5450411 160.321306,19.9780411 L123.306306,6.53104115 Z" id="Path"></path>
          <path d="M491.075306,82.2790411 C478.140306,71.6740411 461.354306,67.4110411 444.948306,70.7510411 L433.478306,73.0450411 C459.965306,98.6460411 480.949306,129.894041 494.432306,165.025041 C504.854306,154.923041 512.391306,140.840041 512.391306,125.212041 C512.391306,108.514041 503.979306,92.8690411 491.075306,82.2790411 Z" id="Path"></path>`;
      break;
    case 2:
      svgpath = `<path d="M435.256105,0.000583712474 C434.972,0.00852583542 434.688439,0.0300485183 434.406482,0.0656813397 C432.477678,0.278916449 430.679188,1.14329655 429.307741,2.51620835 L191.468221,240.33921 L274.213877,323.084802 C279.058117,327.874615 281.797387,334.418167 281.811897,341.229987 C281.811907,341.240735 281.811907,341.251483 281.811897,341.262231 L281.811897,409.526175 L298.890877,409.526175 C301.624235,409.514985 304.186756,408.194868 305.78268,405.97577 C307.378603,403.756672 307.814698,400.907278 306.955539,398.312434 L301.157002,380.816961 L318.669187,374.951818 C323.105731,373.44174 325.493792,368.635905 324.017882,364.187878 L318.219322,346.675638 L335.664882,340.827262 C340.136826,339.345112 342.56111,334.518918 341.080224,330.046555 L335.231687,312.551082 L352.743862,306.685617 C357.207036,305.203304 359.629133,300.388935 358.159172,295.921677 L352.360645,278.40976 L369.806172,272.627806 C371.969323,271.916802 373.758526,270.370636 374.775598,268.333404 C375.79267,266.296172 375.953219,263.936914 375.221515,261.780677 L369.35634,244.284881 L386.868515,238.486483 C389.027787,237.775276 390.813933,236.231734 391.830621,234.198358 C392.847309,232.164982 393.010455,229.80994 392.283857,227.655798 L386.435288,210.143558 L403.930857,204.361927 C406.094079,203.65092 407.883334,202.1047 408.900407,200.067394 C409.91748,198.030087 410.077973,195.670749 409.346167,193.514476 L403.49763,176.085747 L421.009902,170.220604 C425.47305,168.738264 427.895114,163.923903 426.425148,159.456664 L420.559972,141.944424 L438.072245,136.095726 C442.543981,134.613532 444.968174,129.787578 443.48749,125.315341 L437.622283,107.819546 L455.134555,101.954403 C459.597703,100.472063 462.019767,95.6577018 460.5498,91.190463 L454.701263,73.6782231 L472.196897,67.8298469 C476.668803,66.3476565 479.093037,61.5214752 477.612143,57.0491402 L469.047712,31.4891762 C468.6245,30.2254297 467.911126,29.0783986 466.964764,28.1400151 L441.404607,2.51298398 C439.778518,0.879648428 437.560804,-0.0263478928 435.256202,0.000583712474 L435.256105,0.000583712474 Z M170.789974,247.420775 C168.565785,247.456738 166.44328,248.359185 164.874805,249.93657 L36.9073204,377.904058 C35.2971863,379.505133 34.3913062,381.681992 34.3913062,383.952668 L34.3913062,426.591838 C34.4101426,431.30327 38.2443078,435.107624 42.9557434,435.089686 C63.7149703,435.089686 72.2246317,437.075902 78.9133226,441.254696 C85.6019265,445.435101 92.0413375,453.632759 105.173276,466.765004 L135.965496,497.557166 C155.222724,516.814117 186.624077,516.814439 205.88106,497.557166 L262.233412,441.137973 C263.849608,439.539734 264.761266,437.362665 264.76616,435.089686 L264.76616,341.246754 C264.761266,338.973774 263.849608,336.796705 262.233412,335.198466 L176.971741,249.93657 C175.34213,248.297858 173.117458,247.390322 170.806606,247.420775 L170.789974,247.420775 Z M170.906697,307.139609 C175.618115,307.139932 179.437874,310.959207 179.437874,315.67099 C179.437874,320.382451 175.618115,324.202049 170.906697,324.202049 C166.195278,324.202049 162.375532,320.382451 162.375532,315.67099 C162.375532,310.959207 166.195278,307.139932 170.906697,307.139609 Z M205.031372,332.733107 C209.743123,332.733107 213.562527,336.552705 213.562527,341.264488 C213.562527,345.975948 209.743123,349.795869 205.031372,349.795546 C200.319944,349.795546 196.500185,345.975948 196.500185,341.264488 C196.500185,336.552705 200.319944,332.733429 205.031372,332.733107 Z M123.968651,352.661657 C130.539098,352.670079 137.103147,355.167037 142.06402,360.126452 L198.982923,417.028657 C208.904591,426.950067 208.904591,443.26445 198.982923,453.18586 L193.234374,458.934603 C183.312641,468.856013 166.998316,468.856013 157.076909,458.934603 L100.157996,402.032399 C90.2485352,392.110666 90.2040001,375.746305 100.123817,365.824895 L105.855739,360.076474 C110.81644,355.115769 117.397298,352.65041 123.967829,352.661657 L123.968651,352.661657 Z M222.093682,375.389044 C226.805111,375.389044 230.62487,379.208642 230.62487,383.920102 C230.62487,388.631885 226.805111,392.451483 222.093682,392.451483 C217.382286,392.451483 213.562527,388.631885 213.562527,383.920102 C213.562527,379.208642 217.382286,375.389044 222.093682,375.389044 Z" id="path6034"></path>`;
      break;
    case 3:
      svgpath = `<path d="M509.891306,207.8 L304.591306,2.5 C303.781306,1.69 302.821306,1.067 301.781306,0.642 C300.927306,0.292 300.019306,0.172 299.112306,0.111 C298.921306,0.097 298.749306,-1.98951966e-13 298.558306,-1.98951966e-13 L214.225306,-1.98951966e-13 C211.962306,-1.98951966e-13 209.792306,0.9 208.192306,2.5 L2.89130624,207.8 C2.08130624,208.61 1.45830624,209.57 1.03330624,210.61 C0.683306241,211.464 0.563306241,212.372 0.502306241,213.279 C0.488306241,213.47 0.391306241,213.642 0.391306241,213.833 L0.391306241,298.166 C0.391306241,300.429 1.29130624,302.599 2.89130624,304.199 L208.191306,509.499 C209.001306,510.309 209.961306,510.932 211.001306,511.357 C211.855306,511.707 212.763306,511.827 213.670306,511.888 C213.860306,511.901 214.032306,511.998 214.224306,511.998 L298.557306,511.998 C300.820306,511.998 302.990306,511.098 304.590306,509.498 L509.890306,304.198 C510.700306,303.388 511.323306,302.428 511.748306,301.388 C512.098306,300.534 512.218306,299.626 512.279306,298.719 C512.292306,298.529 512.38931,298.357 512.38931,298.165 L512.38931,213.832 C512.38931,211.571 511.491306,209.4 509.891306,207.8 Z M217.758306,17.067 L277.946306,17.067 L74.9123062,220.1 C71.5793062,223.433 71.5793062,228.833 74.9123062,232.167 L244.325306,401.579 L226.525306,419.379 L20.9853062,213.84 L217.758306,17.067 Z M122.878306,256 L256.391306,122.487 L389.904306,256 L256.391306,389.513 L122.878306,256 Z M17.4583062,294.633 L17.4583062,234.445 L220.491306,437.479 C222.158306,439.146 224.341306,439.979 226.524306,439.979 C228.707306,439.979 230.891306,439.146 232.557306,437.479 L401.969306,268.066 L419.769306,285.866 L214.229306,491.406 L17.4583062,294.633 Z M295.024306,494.933 L234.837306,494.933 L437.870306,291.9 C441.203306,288.567 441.203306,283.167 437.870306,279.833 L268.458306,110.421 L286.258306,92.621 L491.798306,298.161 L295.024306,494.933 Z M495.325306,277.554 L292.291306,74.521 C288.958306,71.188 283.558306,71.188 280.224306,74.521 L110.812306,243.933 L93.0123062,226.133 L298.552306,20.593 L495.325306,217.366 L495.325306,277.554 L495.325306,277.554 Z" id="Shape"></path>`;
      break;
    case 4:
      svgpath = `<path d="M311.289306,425.60247 C310.767306,425.60247 310.767306,425.60247 310.244306,425.60247 C303.975306,425.08047 298.750306,420.90047 296.660306,415.15347 L198.962306,142.43547 L137.313306,263.64347 C134.701306,268.86747 129.476306,272.00247 123.207306,272.00247 L50.0643062,272.00247 C41.1833062,272.00247 34.3913062,265.21147 34.3913062,256.32947 C34.3913062,247.44747 41.1833062,240.65647 50.0643062,240.65647 L113.803306,240.65647 L187.991306,95.4154698 C190.603306,89.6684698 196.873306,86.5334698 203.142306,87.0564698 C209.411306,87.5794698 214.636306,91.7584698 216.726306,97.5054698 L313.901306,370.22347 L375.550306,249.01547 C378.162306,243.79147 383.387306,240.65647 389.656306,240.65647 L462.799306,240.65647 C471.681306,240.65647 478.472306,247.44847 478.472306,256.32947 C478.472306,265.21147 471.680306,272.00247 462.799306,272.00247 L399.060306,272.00247 L325.395306,417.24347 C322.783306,422.46847 317.036306,425.60247 311.289306,425.60247 Z" id="Path"></path>`;
      break;
    case 5:
      svgpath = `<path d="M247.790306,264.467 L247.790306,255.934 L247.790306,153.278 L247.790306,153.276 C240.490306,158.927 231.533306,162.013 222.304306,162.064 C222.266306,162.064 222.228306,162.066 222.190306,162.066 L222.190306,162.066 C221.611306,162.064 221.032306,162.051 220.456306,162.025 C211.803306,161.643 203.463306,158.595 196.590306,153.276 L196.590306,153.276 L196.590306,153.276 L196.590306,255.932 L196.590306,264.465 L196.590306,264.467 L247.790306,264.467 L247.790306,264.467 Z M222.190306,213.267 C226.903306,213.267 230.723306,217.087 230.723306,221.8 L230.723306,238.866 C230.723306,239.75 230.589306,240.602 230.339306,241.404 C230.173306,241.938 229.956306,242.45 229.693306,242.934 C229.562306,243.176 229.419306,243.411 229.266306,243.638 C228.653306,244.546 227.869306,245.33 226.961306,245.943 C226.734306,246.096 226.499306,246.239 226.257306,246.37 C225.048306,247.027 223.662306,247.4 222.189306,247.4 C220.716306,247.4 219.331306,247.027 218.121306,246.37 C217.879306,246.239 217.644306,246.096 217.417306,245.943 C216.509306,245.33 215.725306,244.546 215.112306,243.638 C214.959306,243.411 214.816306,243.176 214.685306,242.934 C214.422306,242.45 214.205306,241.938 214.039306,241.404 C213.790306,240.602 213.655306,239.75 213.655306,238.866 L213.655306,221.8 C213.657306,217.088 217.478306,213.267 222.190306,213.267 Z" id="Shape"></path>
          <path d="M222.190306,145.001 C236.328306,145.001 247.790306,133.539 247.790306,119.401 C247.790306,119.401 247.790306,119.401 247.790306,119.401 C247.790306,119.401 247.790306,119.401 247.790306,119.401 C247.788306,118.67 247.748306,117.948 247.686306,117.233 C247.673306,117.085 247.666306,116.935 247.651306,116.787 C247.649306,116.771 247.647306,116.756 247.645306,116.741 C247.580306,116.126 247.486306,115.52 247.379306,114.919 C247.283306,114.382 247.172306,113.849 247.042306,113.324 C247.017306,113.22 246.996306,113.115 246.969306,113.012 C246.969306,113.011 246.969306,113.011 246.968306,113.01 C246.797306,112.35 246.593306,111.703 246.372306,111.065 C246.244306,110.696 246.108306,110.331 245.963306,109.97 C245.740306,109.411 245.504306,108.858 245.244306,108.318 C244.562306,106.907 243.751306,105.572 242.833306,104.319 C242.781306,104.248 242.733306,104.175 242.680306,104.105 C241.294306,102.254 239.660306,100.601 237.833306,99.184 C237.673306,99.06 237.513306,98.935 237.349306,98.814 C236.083306,97.879 234.731306,97.056 233.302306,96.363 C233.292306,96.358 233.282306,96.353 233.272306,96.348 C232.408306,95.93 231.514306,95.566 230.599306,95.245 C229.787306,94.961 228.957306,94.717 228.110306,94.514 C227.517306,94.372 226.917306,94.248 226.309306,94.148 C225.389306,93.997 224.454306,93.89 223.503306,93.839 C223.067306,93.816 222.629306,93.803 222.187306,93.802 L222.187306,93.8 C208.049306,93.8 196.587306,105.261 196.587306,119.4 C196.587306,119.4 196.587306,119.4 196.587306,119.4 C196.587306,119.4 196.587306,119.4 196.587306,119.4 C196.590306,133.539 208.052306,145.001 222.190306,145.001 Z" id="Path"></path>
          <path d="M153.924306,110.867 C168.062306,110.867 179.524306,99.406 179.524306,85.267 C179.482306,71.146 168.045306,59.709 153.924306,59.668 L153.924306,59.667 C139.785306,59.667 128.324306,71.128 128.324306,85.267 C128.324306,99.406 139.785306,110.867 153.924306,110.867 Z" id="Path"></path>
          <path d="M384.324306,264.468 L384.324306,255.934 L384.324306,119.144 C377.024306,124.794 368.068306,127.88 358.839306,127.931 C358.801306,127.931 358.762306,127.933 358.724306,127.933 L358.724306,127.933 C349.455306,127.907 340.454306,124.817 333.124306,119.144 L333.124306,119.144 L333.124306,255.934 L333.124306,264.468 L333.124306,264.468 L384.324306,264.468 L384.324306,264.468 Z M358.724306,247.4 C354.011306,247.4 350.191306,243.579 350.191306,238.867 L350.191306,221.801 C350.191306,217.088 354.011306,213.268 358.724306,213.268 C363.437306,213.268 367.257306,217.088 367.257306,221.801 L367.257306,238.867 C367.257306,243.579 363.436306,247.4 358.724306,247.4 Z" id="Shape"></path>
          <path d="M358.724306,110.867 C372.862306,110.867 384.324306,99.406 384.324306,85.267 C384.324306,85.267 384.324306,85.267 384.324306,85.267 C384.324306,85.267 384.324306,85.267 384.324306,85.267 C384.322306,84.504 384.280306,83.75 384.212306,83.004 C384.201306,82.887 384.196306,82.769 384.184306,82.653 C384.177306,82.582 384.165306,82.512 384.157306,82.441 C384.020306,81.226 383.803306,80.035 383.503306,78.878 C383.473306,78.76 383.435306,78.646 383.403306,78.529 C383.212306,77.834 382.998306,77.148 382.752306,76.477 C382.691306,76.311 382.621306,76.149 382.557306,75.984 C382.470306,75.761 382.386306,75.536 382.292306,75.316 C382.036306,74.712 381.751306,74.124 381.450306,73.545 C381.180306,73.024 380.899306,72.51 380.595306,72.01 C380.550306,71.936 380.500306,71.865 380.454306,71.791 C380.187306,71.362 379.906306,70.943 379.614306,70.531 C379.134306,69.852 378.621306,69.198 378.079306,68.57 C377.669306,68.095 377.247306,67.63 376.803306,67.187 C376.749306,67.133 376.692306,67.083 376.638306,67.03 C376.054306,66.457 375.444306,65.911 374.807306,65.395 C374.387306,65.055 373.955306,64.73 373.514306,64.416 C372.737306,63.863 371.931306,63.351 371.094306,62.885 C370.692306,62.662 370.284306,62.446 369.869306,62.244 C369.848306,62.234 369.828306,62.223 369.808306,62.212 C368.944306,61.794 368.050306,61.43 367.135306,61.109 C366.288306,60.813 365.422306,60.56 364.537306,60.353 C363.996306,60.226 363.449306,60.114 362.895306,60.022 C361.959306,59.866 361.007306,59.756 360.039306,59.704 C359.603306,59.681 359.165306,59.668 358.723306,59.667 L358.723306,59.666 C344.585306,59.666 333.123306,71.127 333.123306,85.266 C333.123306,85.266 333.123306,85.266 333.123306,85.266 C333.123306,85.266 333.123306,85.266 333.123306,85.266 C333.124306,99.406 344.585306,110.867 358.724306,110.867 Z" id="Path"></path>
          <path d="M290.457306,145.001 C304.595306,145.001 316.057306,133.539 316.057306,119.401 C316.057306,119.401 316.057306,119.401 316.057306,119.401 C316.057306,119.401 316.057306,119.401 316.057306,119.401 C316.055306,118.67 316.015306,117.948 315.953306,117.233 C315.940306,117.085 315.933306,116.935 315.918306,116.787 C315.916306,116.771 315.914306,116.756 315.912306,116.741 C315.847306,116.126 315.753306,115.52 315.646306,114.919 C315.550306,114.382 315.439306,113.849 315.309306,113.324 C315.284306,113.22 315.263306,113.115 315.236306,113.012 C315.236306,113.011 315.236306,113.011 315.235306,113.01 C315.064306,112.35 314.860306,111.703 314.639306,111.065 C314.511306,110.696 314.375306,110.331 314.230306,109.97 C314.007306,109.411 313.771306,108.858 313.511306,108.318 C313.057306,107.379 312.542306,106.477 311.982306,105.606 C311.653306,105.094 311.312306,104.591 310.948306,104.105 C310.259306,103.184 309.506306,102.314 308.702306,101.495 C308.646306,101.438 308.593306,101.378 308.537306,101.322 C307.773306,100.558 306.957306,99.847 306.102306,99.184 C305.942306,99.06 305.782306,98.935 305.618306,98.814 C304.352306,97.879 303.000306,97.056 301.571306,96.363 C301.561306,96.358 301.551306,96.353 301.541306,96.348 C300.677306,95.93 299.783306,95.566 298.868306,95.245 C298.021306,94.949 297.155306,94.696 296.270306,94.489 C295.729306,94.362 295.182306,94.25 294.628306,94.158 C293.692306,94.002 292.740306,93.892 291.772306,93.84 C291.336306,93.817 290.898306,93.804 290.456306,93.803 L290.456306,93.8 C276.318306,93.8 264.856306,105.261 264.856306,119.4 C264.856306,119.4 264.856306,119.4 264.856306,119.4 C264.856306,119.4 264.856306,119.4 264.856306,119.4 C264.857306,133.539 276.318306,145.001 290.457306,145.001 Z" id="Path"></path>
          <path d="M316.057306,264.467 L316.057306,255.934 L316.057306,153.278 L316.057306,153.276 C308.727306,158.95 299.726306,162.041 290.457306,162.067 L290.457306,162.066 C289.878306,162.064 289.299306,162.051 288.723306,162.025 C280.070306,161.643 271.730306,158.595 264.857306,153.276 L264.857306,153.276 L264.857306,153.276 L264.857306,255.932 L264.857306,264.465 L264.857306,264.467 L316.057306,264.467 L316.057306,264.467 Z M290.457306,213.267 C295.170306,213.267 298.990306,217.087 298.990306,221.8 L298.990306,238.866 C298.990306,239.75 298.856306,240.602 298.606306,241.404 C298.440306,241.938 298.223306,242.45 297.960306,242.934 C297.829306,243.176 297.686306,243.411 297.533306,243.638 C296.920306,244.546 296.136306,245.33 295.228306,245.943 C295.001306,246.096 294.766306,246.239 294.524306,246.37 C293.315306,247.027 291.929306,247.4 290.456306,247.4 C288.983306,247.4 287.598306,247.027 286.388306,246.37 C286.146306,246.239 285.911306,246.096 285.684306,245.943 C284.776306,245.33 283.992306,244.546 283.379306,243.638 C283.226306,243.411 283.083306,243.176 282.952306,242.934 C282.689306,242.45 282.472306,241.938 282.306306,241.404 C282.057306,240.602 281.922306,239.75 281.922306,238.866 L281.922306,221.8 C281.924306,217.088 285.744306,213.267 290.457306,213.267 Z" id="Shape"></path>
          <path d="M486.724306,281.533 L478.190306,281.533 C473.477306,281.533 469.657306,285.353 469.657306,290.066 L469.657306,290.067 L469.657306,486.333 C469.657306,491.046 473.477306,494.866 478.190306,494.866 L486.723306,494.866 C491.436306,494.866 495.256306,491.046 495.256306,486.333 L495.256306,290.067 C495.257306,285.354 491.436306,281.533 486.724306,281.533 Z" id="Path"></path>
          <path d="M444.057306,281.534 L68.5903062,281.534 C63.8773062,281.534 60.0573062,285.354 60.0573062,290.067 L60.0573062,486.334 C60.0573062,491.047 63.8773062,494.867 68.5903062,494.867 L111.257306,494.867 L111.257306,325.321 C111.020306,312.852 119.546306,301.92 131.698306,299.113 C145.593306,296.302 159.136306,305.286 161.947306,319.181 C162.281306,320.834 162.452306,322.515 162.457306,324.201 L350.190306,324.201 C350.229306,310.025 361.752306,298.564 375.929306,298.603 C377.615306,298.608 379.297306,298.778 380.949306,299.113 C393.101306,301.92 401.627306,312.852 401.390306,325.321 L401.390306,494.867 L444.057306,494.867 C448.770306,494.867 452.590306,491.046 452.590306,486.334 L452.590306,290.067 C452.590306,285.354 448.770306,281.534 444.057306,281.534 Z" id="Path"></path>
          <path d="M136.857306,264.467 L170.990306,264.467 C175.703306,264.467 179.523306,260.647 179.523306,255.934 L179.523306,119.144 C172.193306,124.817 163.192306,127.908 153.923306,127.934 L153.923306,127.933 C144.654306,127.907 135.653306,124.817 128.323306,119.144 L128.323306,255.933 C128.324306,260.646 132.144306,264.467 136.857306,264.467 Z M145.390306,221.8 C145.390306,217.087 149.211306,213.267 153.923306,213.267 C158.636306,213.267 162.456306,217.087 162.456306,221.8 L162.456306,238.867 C162.456306,243.58 158.635306,247.4 153.923306,247.4 C149.210306,247.4 145.390306,243.579 145.390306,238.867 L145.390306,221.8 L145.390306,221.8 Z" id="Shape"></path>
          <path d="M162.457306,341.267 L162.457306,401 L162.457306,401.001 L179.524306,401.001 L179.524306,401 L179.524306,366.867 C179.524306,362.154 183.344306,358.334 188.057306,358.334 C192.770306,358.334 196.590306,362.155 196.590306,366.867 L196.590306,401 L196.590306,401.001 L213.657306,401.001 L213.657306,401 L213.657306,366.867 C213.657306,362.154 217.477306,358.334 222.190306,358.334 C226.903306,358.334 230.723306,362.155 230.723306,366.867 L230.723306,401 L230.723306,401.001 L247.790306,401.001 L247.790306,401 L247.790306,366.867 C247.790306,362.154 251.610306,358.334 256.323306,358.334 C261.036306,358.334 264.856306,362.155 264.856306,366.867 L264.856306,401 L264.856306,401.001 L281.923306,401.001 L281.923306,401 L281.923306,366.867 C281.923306,362.154 285.743306,358.334 290.456306,358.334 C295.169306,358.334 298.989306,362.155 298.989306,366.867 L298.989306,401 L298.989306,401.001 L316.056306,401.001 L316.056306,401 L316.056306,366.867 C316.056306,362.154 319.876306,358.334 324.589306,358.334 C329.302306,358.334 333.122306,362.155 333.122306,366.867 L333.122306,401 L333.122306,401.001 L350.190306,401.001 L350.190306,401 L350.190306,341.267 L350.190306,341.266 L162.457306,341.267 L162.457306,341.267 Z" id="Path"></path>
          <path d="M426.990306,17.001 L426.990306,17.001 C412.852306,17 401.390306,28.461 401.390306,42.6 C401.390306,56.739 412.851306,68.2 426.990306,68.2 C441.129306,68.2 452.590306,56.738 452.590306,42.6 C452.549306,28.479 441.111306,17.042 426.990306,17.001 Z" id="Path"></path>
          <path d="M401.390306,76.477 L401.390306,255.934 C401.390306,260.647 405.210306,264.467 409.923306,264.467 L444.056306,264.467 C448.769306,264.467 452.589306,260.647 452.589306,255.934 L452.589306,76.477 C445.259306,82.15 436.258306,85.241 426.989306,85.267 C417.721306,85.241 408.721306,82.151 401.390306,76.477 Z M435.524306,221.801 L435.524306,238.868 C435.524306,243.581 431.704306,247.401 426.991306,247.401 C422.278306,247.401 418.458306,243.581 418.458306,238.868 L418.458306,221.801 C418.458306,217.088 422.278306,213.268 426.991306,213.268 C431.704306,213.268 435.524306,217.088 435.524306,221.801 Z" id="Shape"></path>
          <path d="M375.790306,315.667 L375.790306,315.667 C371.083306,315.68 367.271306,319.493 367.257306,324.2 L367.257306,494.867 L384.324306,494.867 L384.324306,324.2 C384.309306,319.493 380.497306,315.681 375.790306,315.667 Z" id="Path"></path>
          <path d="M162.457306,494.867 L184.558306,494.867 L224.665306,454.675 C227.997306,451.315 233.422306,451.292 236.782306,454.624 C240.142306,457.956 240.165306,463.381 236.833306,466.741 C236.816306,466.758 236.799306,466.775 236.782306,466.792 L208.622306,494.867 L247.790306,494.867 L247.790306,477.8 C247.790306,473.087 251.610306,469.267 256.323306,469.267 C261.036306,469.267 264.856306,473.087 264.856306,477.8 L264.856306,494.867 L304.024306,494.867 L275.864306,466.792 C272.533306,463.431 272.556306,458.006 275.917306,454.675 C279.257306,451.364 284.641306,451.364 287.981306,454.675 L328.088306,494.867 L350.190306,494.867 L350.190306,418.067 L162.457306,418.067 L162.457306,494.867 Z" id="Path"></path>
          <path d="M85.6573062,68.2 C99.7953062,68.2 111.257306,56.738 111.257306,42.6 C111.215306,28.479 99.7783062,17.042 85.6573062,17.001 L85.6573062,17 C71.5193062,17 60.0573062,28.461 60.0573062,42.6 C60.0573062,56.739 71.5183062,68.2 85.6573062,68.2 Z" id="Path"></path>
          <path d="M68.5903062,264.467 L102.723306,264.467 C107.436306,264.467 111.256306,260.647 111.256306,255.934 L111.256306,76.477 C103.926306,82.15 94.9253062,85.241 85.6563062,85.267 C76.3873062,85.241 67.3863062,82.151 60.0563062,76.477 L60.0563062,255.934 C60.0573062,260.647 63.8773062,264.467 68.5903062,264.467 Z M77.1243062,221.801 C77.1243062,217.088 80.9443062,213.268 85.6573062,213.268 C90.3703062,213.268 94.1903062,217.088 94.1903062,221.801 L94.1903062,238.868 C94.1903062,243.581 90.3693062,247.401 85.6573062,247.401 C80.9453062,247.401 77.1243062,243.581 77.1243062,238.868 L77.1243062,221.801 L77.1243062,221.801 Z" id="Shape"></path>
          <path d="M136.857306,315.667 L136.857306,315.667 C132.150306,315.68 128.338306,319.493 128.324306,324.2 L128.324306,494.867 L145.390306,494.867 L145.390306,324.2 C145.376306,319.493 141.564306,315.681 136.857306,315.667 Z" id="Path"></path>
          <path d="M34.4573062,281.533 L25.9243062,281.533 C21.2113062,281.533 17.3913062,285.354 17.3913062,290.066 L17.3913062,290.067 L17.3913062,486.333 C17.3913062,491.046 21.2113062,494.866 25.9243062,494.866 L34.4573062,494.866 C39.1703062,494.866 42.9903062,491.046 42.9903062,486.333 L42.9903062,290.067 C42.9903062,285.354 39.1703062,281.533 34.4573062,281.533 Z" id="Path"></path>`;
      break;
    case 6:
      svgpath = `<path d="M45.9713062,66.006 L45.0353062,66.006 C20.4183062,66.006 0.391306241,86.193 0.391306241,111.006 L0.391306241,150.877 C0.391306241,175.69 20.4183062,195.877 45.0353062,195.877 L45.9713062,195.877 L45.9713062,66.006 Z" id="Path"></path>
          <path d="M467.747306,195.876 C492.363306,195.876 512.391306,175.689 512.391306,150.876 L512.391306,111.005 C512.391306,86.192 492.364306,66.005 467.747306,66.005 L466.811306,66.005 L466.811306,195.876 L467.747306,195.876 Z" id="Path"></path>
          <path d="M74.9713062,225.876 L74.9713062,497 C74.9713062,505.284 81.6873062,512 89.9713062,512 L422.811306,512 C431.095306,512 437.811306,505.284 437.811306,497 L437.811306,225.876 L74.9713062,225.876 Z M361.203306,278.938 C369.487306,278.938 376.203306,285.654 376.203306,293.938 C376.203306,302.222 369.487306,308.938 361.203306,308.938 L151.579306,308.938 C143.295306,308.938 136.579306,302.222 136.579306,293.938 C136.579306,285.654 143.295306,278.938 151.579306,278.938 L361.203306,278.938 Z M361.203306,428.938 L151.579306,428.938 C143.295306,428.938 136.579306,422.222 136.579306,413.938 C136.579306,405.654 143.295306,398.938 151.579306,398.938 L361.202306,398.938 C369.486306,398.938 376.202306,405.654 376.202306,413.938 C376.202306,422.222 369.487306,428.938 361.203306,428.938 Z M361.203306,368.938 L151.579306,368.938 C143.295306,368.938 136.579306,362.222 136.579306,353.938 C136.579306,345.654 143.295306,338.938 151.579306,338.938 L361.202306,338.938 C369.486306,338.938 376.202306,345.654 376.202306,353.938 C376.202306,362.222 369.487306,368.938 361.203306,368.938 Z" id="Shape"></path>
          <path d="M74.9713062,195.876 L437.811306,195.876 L437.811306,15 C437.811306,6.716 431.095306,0 422.811306,0 L89.9713062,0 C81.6873062,0 74.9713062,6.716 74.9713062,15 L74.9713062,195.876 Z M331.203306,65 C356.016306,65 376.203306,85.187 376.203306,110 C376.203306,134.813 356.016306,155 331.203306,155 C306.390306,155 286.203306,134.813 286.203306,110 C286.203306,85.187 306.389306,65 331.203306,65 Z M181.579306,65 C206.392306,65 226.579306,85.187 226.579306,110 C226.579306,134.813 206.392306,155 181.579306,155 C156.766306,155 136.579306,134.813 136.579306,110 C136.579306,85.187 156.766306,65 181.579306,65 Z" id="Shape"></path>
          <circle id="Oval" cx="331.203306" cy="110" r="15"></circle>
          <circle id="Oval" cx="181.579306" cy="110" r="15"></circle>
          <path d="M45.9713062,225.592 L45.0353062,225.592 C20.4193062,225.592 0.391306241,245.779 0.391306241,270.592 L0.391306241,310.463 C0.391306241,335.276 20.4183062,355.463 45.0353062,355.463 L45.9713062,355.463 L45.9713062,225.592 Z" id="Path"></path>
          <path d="M467.747306,355.462 C492.363306,355.462 512.391306,335.275 512.391306,310.462 L512.391306,270.591 C512.391306,245.778 492.364306,225.591 467.747306,225.591 L466.811306,225.591 L466.811306,355.462 L467.747306,355.462 Z" id="Path"></path>`;
      break;
    case 7:
      svgpath = `<polygon id="Path" points="390.777 166.248 414.817 190.202 474.318 141.89 455.407 118.601 416.866 149.894 393.699 126.809 335.522 169.739 353.334 193.878"></polygon>
            <polygon id="Path" points="390.777 345.752 353.334 318.122 335.522 342.261 393.699 385.191 416.866 362.106 455.407 393.399 474.318 370.11 414.817 321.798"></polygon>
            <polygon id="Path" points="404.291 226.784 339.177 251.116 349.678 279.218 402.312 259.55 451.296 284.944 511.638 266.869 503.029 238.131 454.321 252.722"></polygon>
            <polygon id="Path" points="107.334 394.208 220.667 479.425 220.667 32.575 107.334 117.792"></polygon>
            <polygon id="Path" points="-1.16018306e-14 132.771 77.333 132.771 77.333 379.23 -1.42108547e-14 379.23"></polygon>
            <polygon id="Path" points="250.667 10.018 250.667 501.982 263.99 512 310 512 310 0 263.99 0"></polygon`;
      break;
    case 8:
      svgpath = `<path d="M506.182048,84.9439825 C482.938818,62.3879111 456.678015,41.3791608 425.123659,32.1087081 C391.056727,22.100435 355.631644,31.3229213 326.104813,49.5377627 C300.014317,65.6334588 278.199839,87.658666 256.607407,109.146541 C239.151405,126.51739 221.695942,143.888777 204.23994,161.259625 C206.079371,162.408663 207.805084,163.768969 209.377197,165.340543 L227.319331,183.282676 C229.332842,185.296188 231.009511,187.557616 232.323467,189.995818 C246.927354,175.463073 261.530702,160.929788 276.135127,146.397043 C294.462609,128.158488 312.466722,109.349725 332.888018,93.4087072 C343.037496,85.9146287 353.801914,79.2963415 365.379605,74.2620238 C372.341202,71.6206374 379.501132,69.6189827 386.855084,68.4478477 C392.39278,67.9309961 397.935326,67.9256066 403.471944,68.4424582 C410.185086,69.5246668 416.725764,71.3290662 423.084817,73.7290038 C433.64713,78.3547985 443.471621,84.4287478 452.740457,91.2706986 C454.132561,92.3609914 455.508496,93.4712252 456.876348,94.5900822 L248.724208,302.742222 L270.134475,324.069491 C270.63408,324.56694 271.10566,325.084331 271.561611,325.611422 L285.09299,312.080043 C286.985777,310.187256 288.049122,307.620244 288.049122,304.942209 L288.049122,289.988006 C288.049122,287.934612 289.713934,286.270879 291.766789,286.270879 L306.875131,286.270879 C308.928525,286.270879 310.592259,284.606606 310.592259,282.553212 L310.592259,267.444869 C310.592259,265.391476 312.256532,263.727742 314.309925,263.727742 L329.418268,263.727742 C331.471662,263.727742 333.135396,262.06293 333.135396,260.010075 L333.135396,244.901733 C333.135396,242.848339 334.799668,241.184605 336.853062,241.184605 L351.960866,241.184605 C354.014798,241.184605 355.678532,239.519793 355.678532,237.466939 L355.678532,222.359135 C355.678532,220.305203 357.342805,218.641469 359.396199,218.641469 L374.504002,218.641469 C376.557935,218.641469 378.221669,216.976657 378.221669,214.923802 L378.221669,199.81546 C378.221669,197.762066 379.885942,196.097793 381.938796,196.097793 L397.047139,196.097793 C399.101072,196.097793 400.764805,194.43352 400.764805,192.380126 L400.764805,177.271784 C400.764805,175.21839 402.429078,173.554117 404.481933,173.554117 L419.590276,173.554117 C421.644208,173.554117 423.307942,171.889845 423.307942,169.836451 L423.307942,154.728108 C423.307942,152.674715 424.972215,151.010442 427.02507,151.010442 L442.133412,151.010442 C444.187345,151.010442 445.851079,149.34563 445.851079,147.292775 L445.851079,132.184433 C445.851079,130.131039 447.515352,128.466766 449.568206,128.466766 L464.52241,128.466766 C467.199367,128.466766 469.766917,127.403421 471.660243,125.510095 L481.155437,116.014901 C488.937853,120.892384 499.39022,120.143785 506.174503,113.360041 C513.837811,105.699427 514.042612,92.5722592 506.182048,84.9439825 Z" id="Path"></path>
          <path d="M16.617426,382.22742 C19.4706192,385.068756 23.2033763,386.489425 26.9350555,386.489425 C30.6861369,386.489425 34.4366793,385.054744 37.2936451,382.186999 L42.1156171,377.346703 L107.257241,442.234482 L102.435269,447.075317 C96.7364278,452.795716 96.754752,462.053234 102.47569,467.750997 L114.791202,480.019081 C117.644395,482.860417 121.377152,484.281086 125.108831,484.281086 C128.859912,484.281086 132.610994,482.846405 135.467421,479.97866 L150.607561,464.779774 L162.808277,452.531631 L260.666767,354.291565 C265.868159,349.069693 266.304168,340.902468 261.990425,335.183686 C261.57759,334.637192 261.125412,334.111717 260.626885,333.615346 L239.198294,312.270292 L179.433759,252.739122 L217.792878,214.380003 C221.598932,210.573949 222.968939,205.257222 221.910444,200.359798 C221.31275,197.593375 219.942743,194.960612 217.792878,192.810746 L199.850744,174.868613 C198.1924,173.210268 196.245718,172.014881 194.172922,171.279755 C192.52374,170.694996 190.794793,170.401269 189.065846,170.401269 C185.162242,170.401269 181.260255,171.889845 178.281487,174.868613 L139.845838,213.303723 L139.780086,213.23851 L106.0376,247.112499 L101.726552,251.423548 C101.605827,251.544273 101.49157,251.66877 101.375696,251.792189 L31.6028882,321.836627 L19.4021728,334.08477 L4.26203232,349.283656 C-1.43626986,355.004055 -1.41848456,364.261573 4.30245346,369.959875 L16.617426,382.22742 Z M176.842495,197.875784 C179.41813,195.300149 182.825901,194.075658 186.200257,194.178059 C189.316996,194.272375 192.40571,195.496865 194.784628,197.875784 C197.367269,200.458425 198.590682,203.877514 198.480737,207.261033 C198.379415,210.369149 197.156541,213.446544 194.784628,215.817918 C189.830075,220.772471 181.797048,220.772471 176.842495,215.817918 C171.887942,210.863364 171.887942,202.830337 176.842495,197.875784 Z M62.6037432,329.32855 L91.4924592,300.327194 C97.1907614,294.606256 106.448279,294.58847 112.168678,300.286772 L184.043385,371.882304 C189.763784,377.580606 189.78157,386.838124 184.083268,392.558523 L155.194552,421.559879 C149.496249,427.280817 140.238732,427.298603 134.518332,421.600301 L62.6441644,350.004769 C56.9232264,344.306467 56.9054411,335.049488 62.6037432,329.32855 Z" id="Shape"></path>`;
      break;
  }
  return svgpath;
}
