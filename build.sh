#!/bin/bash

# Helper Methods 
copy_sources_to_tmp_generic () {
   cp -r . /tmp/auth-request-analyser-generic
}

copy_sources_tmp_chrome () {
    cp -r /tmp/auth-request-analyser-generic /tmp/auth-request-analyser-chrome
}

remove_sources_tmp () {
    rm -rf /tmp/auth-request-analyser-generic
    rm -rf /tmp/auth-request-analyser-chrome
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
    rm /tmp/auth-request-analyser-generic/build.sh
}

pack_extension_chrome () {
    zip -r -j "../auth-request-analyser_submission_chrome_$(date '+%Y-%m-%d-%H-%M-%S').zip" /tmp/auth-request-analyser-chrome/
}

create_crx_chrome () {
    echo "    [+] Extension Key path: $EXTENSION_KEY"
    echo "    [+] Opening headless chrome and pack extension..."
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --pack-extension=/tmp/auth-request-analyser-chrome --pack-extension-key=$EXTENSION_KEY
    cp /tmp/auth-request-analyser-chrome.crx "../auth-request-analyser-$(date '+%Y-%m-%d-%H-%M-%S').crx"
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
    echo "  [+] Create ZIP archive"
    pack_extension_chrome   
    #echo "  [+] Create .crx bundle"
    #create_crx_chrome   
    echo "[*] Stage 1: Done."
############### Generic Cleanup
    echo "[*] Stage 3: Cleanup"
    echo "  [+] Remove temporary directories from /tmp"
    remove_sources_tmp
    echo "[*] Stage 3: Done."
    echo "[>] All done."
}

main