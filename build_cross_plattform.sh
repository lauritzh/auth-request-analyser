#!/bin/bash

# Helper Methods 
copy_sources_to_tmp_generic () {
   cp -r . /tmp/auth-request-analyser-generic
}

copy_sources_tmp_chrome () {
    cp -r /tmp/auth-request-analyser-generic /tmp/auth-request-analyser-chrome
}

copy_sources_tmp_firefox () {
    cp -r /tmp/auth-request-analyser-generic /tmp/auth-request-analyser-firefox
}

remove_sources_tmp () {
    rm -rf /tmp/auth-request-analyser-generic
    rm -rf /tmp/auth-request-analyser-chrome
    rm -rf /tmp/auth-request-analyser-firefox
}

cleanup_generic_directory () {
    echo "    [+] Clean source directory... remove screenshot files"
    rm /tmp/auth-request-analyser-generic/*screenshot*.png
    echo "    [+] Clean source directory... remove .git* files and directories"
    rm -rf /tmp/auth-request-analyser-generic/.git*
    echo "    [+] Clean source directory... remove *.md files"
    rm /tmp/auth-request-analyser-generic/*.md
    echo "    [+] Clean source directory... remove .DS_Store"
    rm /tmp/auth-request-analyser-generic/.DS_Store*
    echo "    [+] Clean source directory... remove build script"
    rm /tmp/auth-request-analyser-generic/build_cross_plattform.sh
}

adjust_manifest_file_chrome () {
    echo "    [+] Adjust manifest file... set version to '3'"
    sed -i.bak 's/MANIFEST-VERSION/3/' /tmp/auth-request-analyser-chrome/manifest.json
    echo "    [+] Adjust manifest file... set background-service_worker"
    sed -i.bak 's/MANIFEST-BACKGROUND/"service_worker":"background.js"/' /tmp/auth-request-analyser-chrome/manifest.json
    echo "    [+] Adjust manifest file... set action"
    sed -i.bak 's/MANIFEST-ACTION/"default_popup": "popup.html"/' /tmp/auth-request-analyser-chrome/manifest.json
    echo "    [+] Clean source directory... remove *.bak files"
    rm /tmp/auth-request-analyser-chrome/*.bak
}

adjust_manifest_file_firefox () {
    echo "    [+] Adjust manifest file... set version to '2'"
    sed -i.bak 's/MANIFEST-VERSION/2/' /tmp/auth-request-analyser-firefox/manifest.json
    echo "    [+] Adjust manifest file... set background-scrpts"
    sed -i.bak 's/MANIFEST-BACKGROUND/"default_popup": "popup.html"/' /tmp/auth-request-analyser-firefox/manifest.json
    echo "    [+] Clean source directory... remove *.bak files"
    rm /tmp/auth-request-analyser-firefox/*.bak
}

pack_extension_chrome () {
    zip -r -j "../auth-request-analyser_submission_chrome_$(date '+%Y-%m-%d-%H-%M-%S').zip" /tmp/auth-request-analyser-chrome/
}

pack_extension_firefox () {
    zip -r -j "../auth-request-analyser_submission_firefox_$(date '+%Y-%m-%d-%H-%M-%S').zip" /tmp/auth-request-analyser-firefox/
}

addons_linter () {
    addons-linter /tmp/auth-request-analyser-firefox/
}

# Main
main () {
    echo "[*] Starting the build process..."
############### Generic Setup
    echo "[*] Stage 0: Generic Base Etension"
    echo "  [+] Copy sources to /tmp"
    copy_sources_to_tmp_generic
    echo "  [+] Clean source directory..."
    cleanup_generic_directory
    echo "[*] Stage 0: Done."
############### Chrome
    echo "[*] Stage 1: Chrome Etension"
    echo "  [+] Copy sources to Chrome folder"
    copy_sources_tmp_chrome
 #   echo "  [+] Adjust manifest file"
 #   adjust_manifest_file_chrome
    echo "  [+] Create ZIP archive"
    pack_extension_chrome   
    echo "[*] Stage 1: Done."
############### Firefox
    echo "[*] Stage 2: Firefox Etension"
    echo "  [+] Copy sources to Firefox folder"
    copy_sources_tmp_firefox
 #   echo "  [+] Adjust manifest file"
 #   adjust_manifest_file_firefox 
    echo "  [+] Execute addons-linter for Firefox extensions"
    addons_linter
    echo "  [+] Create ZIP archive"
    pack_extension_firefox   
    echo "[*] Stage 2: Done."
############### Generic Cleanup
    echo "[*] Stage 3: Cleanup"
    echo "  [+] Remove temporary directories from /tmp"
    remove_sources_tmp
    echo "[*] Stage 3: Done."
    echo "[>] All done."
}

main