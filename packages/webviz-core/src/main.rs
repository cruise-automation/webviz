use std::{io::Read, sync::Arc};
use zaplib::*;

fn foo() {
    log!("The Answer to the Ultimate Question of Life, The Universe, and Everything is 42")
}

fn get_zaplib_version() -> String {
    "v0.0.3".to_string()
}

fn call_rust(name: String, params: Vec<ZapParam>) -> Vec<ZapParam> {
    if name == "foo" {
        foo();
        vec![]
    } else if name == "get_zaplib_version" {
        let version = get_zaplib_version();
        let response = version.into_param();
        vec![response]
    } else if name == "get_zaplib_test_string" {
        // Keep in sync with zaplib.test.js
        vec!["dummy_string".to_string().into_param()]
    } else if name == "lz4_decompress" {
        let uncompressed_size = params[0].as_str().parse::<usize>().unwrap();
        let mut uncompressed_data = vec![0u8; uncompressed_size];
        let input = params[1].as_u8_slice();
        let result = lz4_flex::frame::FrameDecoder::new(input).read_exact(&mut uncompressed_data);
        if let Err(error) = result {
            log!("error: {:?}", error);
        }
        vec![Arc::new(uncompressed_data).into_param()]
    } else {
        panic!("Invalid function name {name} passed to call_rust");
    }
}

register_call_rust!(call_rust);

#[cfg(test)]
mod tests {

    #[test]
    fn dummy_test() {
        assert_eq!(true, true);
    }
}
